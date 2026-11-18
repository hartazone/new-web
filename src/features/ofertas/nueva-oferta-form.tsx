import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Check,
	ChevronDown,
	Clock,
	Gift,
	ImageIcon,
	Info,
	Plus,
	TriangleAlert,
	Upload,
	X
} from 'lucide-react';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { categoriasQuery } from '@/features/catalogos/queries';
import type { VentanaRecogida } from '@/features/comercio/api';
import { useComercio, ventanasQuery } from '@/features/comercio/session';
import { useBeforeUnload } from '@/shared/hooks/use-before-unload';
import { AppErrors, isAppError, type AppError } from '@/shared/models/app-error/app-error';
import { describeError } from '@/shared/models/app-error/describe-error';
import { unwrapOrThrow } from '@/shared/models/result/result';
import { Banner } from '@/shared/ui/hz/banner';
import { Chip } from '@/shared/ui/hz/chip';
import { Muted, Panel, PanelTitle } from '@/shared/ui/hz/panel';
import { QuantityStepper } from '@/shared/ui/hz/quantity-stepper';
import { Segmented } from '@/shared/ui/hz/segmented';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Spinner } from '@/shared/ui/primitives/spinner';
import { cn } from '@/shared/utils';
import {
	addDays,
	addMinutes,
	atTime,
	formatClock,
	formatMoney,
	formatWeekday,
	isoDate,
	parseMoney
} from '@/shared/utils/dates';

import { ofertasApi, type Publicacion, type TipoOferta } from './api';
import { ofertaKeys } from './queries';

/** Bookings close this long before the end of the pickup window (design copy). */
const CIERRE_RESERVAS_MIN = 15;
/** Grace period after the window in which a code can still be validated. */
const TOLERANCIA_VALIDACION_MIN = 10;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

type Draft = {
	tipo: TipoOferta;
	nombre: string;
	categoriaId: string;
	items: string[];
	descripcion: string;
	foto: File | null;
	precio: string;
	habitual: string;
	dia: 'hoy' | 'manana';
	ventanaId: string;
	unidades: number;
	apta: boolean;
};

type Field =
	| 'nombre'
	| 'categoria'
	| 'items'
	| 'descripcion'
	| 'foto'
	| 'precio'
	| 'habitual'
	| 'ventana'
	| 'apta';
type Errors = Partial<Record<Field, string>>;

function validate(d: Draft): Errors {
	const e: Errors = {};
	const precio = parseMoney(d.precio);
	const habitual = parseMoney(d.habitual);
	if (!d.nombre.trim()) e.nombre = 'Escribí un nombre para la oferta.';
	else if (d.nombre.trim().length > 60) e.nombre = 'Usá hasta 60 caracteres.';
	if (!d.categoriaId) e.categoria = 'Elegí una categoría.';
	if (d.tipo === 'pack_sorpresa') {
		if (d.items.length < 3)
			e.items = `Agregá al menos 3 cosas que el pack puede traer. Llevás ${d.items.length}.`;
		else if (d.items.length > 8) e.items = 'Podés poner hasta 8 cosas.';
	} else {
		const len = d.descripcion.trim().length;
		if (len < 20 || len > 200)
			e.descripcion = `La descripción va de 20 a 200 caracteres. Llevás ${len}.`;
		if (!d.foto) e.foto = 'Subí una foto del producto.';
	}
	if (!(precio > 0)) e.precio = 'Escribí el precio que paga el cliente.';
	if (!(habitual > 0)) e.habitual = 'Escribí cuánto cuesta normalmente.';
	else if (precio > 0 && habitual <= precio)
		e.habitual = 'El precio habitual tiene que ser mayor que el precio Hartazone.';
	if (!d.ventanaId) e.ventana = 'Elegí un horario de retiro.';
	if (!d.apta) e.apta = 'Marcá la casilla para poder publicar.';
	return e;
}

/** Maps server field errors onto the form fields; the rest goes to the top banner. */
function serverFieldErrors(error: unknown): Errors {
	const appError = isAppError(error) ? error : (error as { error?: unknown })?.error;
	if (!isAppError(appError) || appError.kind !== 'validation') return {};
	const map: Record<string, Field> = {
		nombre: 'nombre',
		descripcion: 'descripcion',
		precio: 'precio',
		valor_referencia: 'habitual',
		categoria_comida_id: 'categoria',
		ventana_id: 'ventana',
		foto_id: 'foto'
	};
	const out: Errors = {};
	for (const [key, messages] of Object.entries(appError.fieldErrors)) {
		const field = map[key];
		if (field) out[field] = [messages].flat().join(' ');
	}
	return out;
}

const ventanaLabel = (v: VentanaRecogida) =>
	`${v.etiqueta ? `${v.etiqueta}: ` : ''}${formatClock(v.hora_inicio)} a ${formatClock(v.hora_fin)}`;

/**
 * "Nueva oferta" (screens 03–05): what is offered, at what price and when it
 * is picked up, with a live preview of the card people see in the app.
 */
export function NuevaOfertaForm({
	onPublished,
	onCancel
}: {
	/** `apta` is false when the offer was saved but the fitness declaration failed. */
	onPublished: (publicacion: Publicacion, dia: 'hoy' | 'manana', apta: boolean) => void;
	onCancel: () => void;
}) {
	const { comercio, membership } = useComercio();
	const queryClient = useQueryClient();
	const { data: categorias = [] } = useQuery(categoriasQuery);
	const { data: ventanas = [], isPending: ventanasPending } = useQuery(
		ventanasQuery(comercio.id)
	);

	const today = useMemo(() => new Date(), []);
	const fechas = { hoy: isoDate(today), manana: isoDate(addDays(today, 1)) };

	const [draft, setDraft] = useState<Draft>({
		tipo: 'pack_sorpresa',
		nombre: '',
		categoriaId: comercio.categoria_comida.id,
		items: [],
		descripcion: '',
		foto: null,
		precio: '',
		habitual: '',
		dia: 'hoy',
		ventanaId: '',
		unidades: 10,
		apta: false
	});
	const [submitted, setSubmitted] = useState(false);
	const [serverErrors, setServerErrors] = useState<Errors>({});

	const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
		setDraft(d => ({ ...d, [key]: value }));
		setServerErrors({});
	};

	const dayOfWeek = (dia: 'hoy' | 'manana') =>
		(dia === 'hoy' ? today : addDays(today, 1)).getDay();
	const ventanasDelDia = ventanas
		.filter(v => v.dia_semana === dayOfWeek(draft.dia))
		.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
	// Default to the first window of the chosen day; keep the choice while it is valid.
	const ventana = ventanasDelDia.find(v => v.id === draft.ventanaId) ?? ventanasDelDia[0] ?? null;
	const effective: Draft = { ...draft, ventanaId: ventana?.id ?? '' };

	const clientErrors = submitted ? validate(effective) : {};
	const errors: Errors = { ...clientErrors, ...serverErrors };
	const errorCount = Object.keys(clientErrors).length;

	const precio = parseMoney(draft.precio);
	const habitual = parseMoney(draft.habitual);
	const ahorro = habitual > precio && precio > 0 ? habitual - precio : null;
	const dirty = !!(draft.nombre || draft.items.length || draft.descripcion || draft.precio);
	useBeforeUnload(dirty);

	const publish = useMutation({
		mutationFn: () => {
			if (!ventana) return Promise.reject(AppErrors.custom('Elegí un horario de retiro.'));
			if (!membership)
				return Promise.reject(
					AppErrors.forbidden('Tu usuario no tiene una membresía activa en este negocio.')
				);
			const day = fechas[draft.dia];
			const inicio = atTime(day, ventana.hora_inicio);
			const fin = atTime(day, ventana.hora_fin);
			const cierran = addMinutes(fin, -CIERRE_RESERVAS_MIN);
			const now = new Date();
			if (cierran <= now)
				return Promise.reject(
					AppErrors.custom(
						'Las reservas de ese horario ya cerraron. Elegí otro horario o publicá para mañana.'
					)
				);

			const base = {
				comercio_id: comercio.id,
				nombre: draft.nombre.trim(),
				categoria_comida_id: draft.categoriaId,
				precio: precio.toFixed(2),
				valor_referencia: habitual.toFixed(2)
			};

			const prepare: ResultAsync<
				{ plantilla_oferta_id: string | null; foto_id: string | null },
				AppError
			> =
				draft.tipo === 'pack_sorpresa'
					? ofertasApi
							.ensurePackTemplate(
								{
									...base,
									tipo: 'pack_sorpresa',
									descripcion: '',
									foto_id: null,
									cantidad_default: draft.unidades
								},
								draft.items
							)
							.map(plantilla => ({
								plantilla_oferta_id: plantilla.id,
								foto_id: null
							}))
					: draft.foto
						? ofertasApi
								.uploadPhoto(draft.foto)
								.map(media => ({ plantilla_oferta_id: null, foto_id: media.id }))
						: errAsync(AppErrors.custom('Subí una foto del producto.'));

			return unwrapOrThrow(
				prepare
					.andThen(extra =>
						ofertasApi.create({
							...base,
							...extra,
							tipo: draft.tipo,
							descripcion:
								draft.tipo === 'pack_sorpresa' ? '' : draft.descripcion.trim(),
							origen: 'manual',
							ventana_id: ventana.id,
							fecha_operativa: day,
							cantidad_total: draft.unidades,
							reservable_desde_at: now.toISOString(),
							reservas_cierran_at: cierran.toISOString(),
							ventana_inicio_at: inicio.toISOString(),
							ventana_fin_at: fin.toISOString(),
							validacion_hasta_at: addMinutes(
								fin,
								TOLERANCIA_VALIDACION_MIN
							).toISOString()
						})
					)
					// The offer exists from here on: if the declaration fails it is not
					// lost, the panel of the offer lets them confirm it again.
					.andThen(created =>
						ofertasApi
							.declararAptitud(created.id, membership.id)
							.map(publicada => ({ publicacion: publicada, apta: true }))
							.orElse(() => okAsync({ publicacion: created, apta: false }))
					)
			);
		},
		onSuccess: ({ publicacion, apta }) => {
			queryClient.invalidateQueries({ queryKey: ofertaKeys.all });
			onPublished(publicacion, draft.dia, apta);
		},
		onError: error => setServerErrors(serverFieldErrors(error))
	});

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitted(true);
		if (Object.keys(validate(effective)).length) {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}
		publish.mutate();
	};

	const topError =
		publish.isError && !Object.keys(serverErrors).length ? describeError(publish.error) : null;

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-6">
			{submitted && errorCount > 0 && (
				<Banner tone="error">
					{errorCount === 1
						? 'Falta 1 dato para publicar. Está marcado en rojo.'
						: `Faltan ${errorCount} datos para publicar. Están marcados en rojo.`}
				</Banner>
			)}
			{topError && <Banner tone="error">{topError}</Banner>}

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
				<div className="flex min-w-0 flex-col gap-6">
					<Panel>
						<PanelTitle>1. ¿Qué vas a ofrecer?</PanelTitle>
						<div
							role="radiogroup"
							aria-label="Tipo de oferta"
							className="grid gap-4 sm:grid-cols-2"
						>
							<TipoCard
								selected={draft.tipo === 'pack_sorpresa'}
								onSelect={() => set('tipo', 'pack_sorpresa')}
								title="Pack sorpresa"
								description="El contenido cambia según lo que haya ese día."
							/>
							<TipoCard
								selected={draft.tipo === 'oferta_especifica'}
								onSelect={() => set('tipo', 'oferta_especifica')}
								title="Oferta específica"
								description="Un producto, plato o combo definido."
							/>
						</div>
					</Panel>

					<Panel>
						<PanelTitle>2. Contale a la gente qué es</PanelTitle>
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField
								label="Nombre de la oferta"
								hint={
									draft.tipo === 'pack_sorpresa'
										? 'Así lo verá la gente en la app.'
										: 'Hasta 60 caracteres.'
								}
								error={errors.nombre}
							>
								{props => (
									<Input
										{...props}
										value={draft.nombre}
										maxLength={60}
										onChange={e => set('nombre', e.target.value)}
										placeholder={
											draft.tipo === 'pack_sorpresa'
												? 'Pack panadería del día'
												: 'Strawberry Shake'
										}
									/>
								)}
							</FormField>
							<FormField
								label="Categoría"
								hint="Elegí la que mejor describe la comida."
								error={errors.categoria}
							>
								{props => (
									<div className="relative">
										<select
											{...props}
											value={draft.categoriaId}
											onChange={e => set('categoriaId', e.target.value)}
											className={selectClass}
										>
											{!categorias.some(c => c.id === draft.categoriaId) && (
												<option value={draft.categoriaId}>
													{comercio.categoria_comida.etiqueta}
												</option>
											)}
											{categorias.map(c => (
												<option key={c.id} value={c.id}>
													{c.etiqueta}
												</option>
											))}
										</select>
										<ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
									</div>
								)}
							</FormField>
						</div>

						{draft.tipo === 'pack_sorpresa' ? (
							<>
								<PackItems
									items={draft.items}
									onChange={items => set('items', items)}
									error={errors.items}
								/>
								<Banner tone="info" className="font-medium">
									La app avisa sola que el contenido del pack puede variar.
								</Banner>
							</>
						) : (
							<>
								<FormField
									label="Descripción"
									hint="De 20 a 200 caracteres. Incluí ingredientes y alérgenos que conozcás."
									error={errors.descripcion}
								>
									{props => (
										<textarea
											{...props}
											value={draft.descripcion}
											maxLength={200}
											rows={3}
											onChange={e => set('descripcion', e.target.value)}
											placeholder="Batido de fresa natural con leche, 16 onzas. Contiene leche."
											className={cn(
												'min-h-[84px] w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-3 focus-visible:ring-selection',
												errors.descripcion && 'border-error'
											)}
										/>
									)}
								</FormField>
								<FotoPicker
									file={draft.foto}
									onChange={f => set('foto', f)}
									error={errors.foto}
								/>
							</>
						)}
					</Panel>

					<Panel>
						<PanelTitle>3. Precio</PanelTitle>
						<Muted>
							El pago es en efectivo al retirar. Cobrás exactamente el precio
							Hartazone.
						</Muted>
						<div className="grid gap-4 sm:grid-cols-2">
							<MoneyField
								label="Precio Hartazone"
								hint="Lo que paga el cliente."
								value={draft.precio}
								onChange={v => set('precio', v)}
								error={errors.precio}
							/>
							<MoneyField
								label="Precio habitual"
								hint="Lo que cuesta normalmente en tu local."
								value={draft.habitual}
								onChange={v => set('habitual', v)}
								error={errors.habitual}
							/>
						</div>
						{ahorro != null && (
							<Chip
								tone="success"
								icon={Check}
								className="h-9 w-fit rounded-lg px-3 text-foreground"
							>
								El cliente ahorra {formatMoney(ahorro)}
							</Chip>
						)}
					</Panel>

					<Panel>
						<PanelTitle>4. Cuándo y cuántas</PanelTitle>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<span className="text-sm leading-5 font-bold">Día</span>
								<Segmented
									label="Día de la oferta"
									size="md"
									className="w-full"
									value={draft.dia}
									onChange={dia => set('dia', dia)}
									items={[
										{
											value: 'hoy',
											label: `Hoy, ${formatWeekday(fechas.hoy)} ${today.getDate()}`
										},
										{
											value: 'manana',
											label: `Mañana, ${formatWeekday(fechas.manana)} ${addDays(today, 1).getDate()}`
										}
									]}
								/>
								<Muted className="text-[13px] leading-[18px]">
									Podés publicar con hasta 48 horas de anticipación.
								</Muted>
							</div>
							<FormField
								label="Horario de retiro"
								hint={
									ventanasDelDia.length || ventanasPending
										? `Viene de Mi negocio. Las reservas cierran ${CIERRE_RESERVAS_MIN} minutos antes.`
										: undefined
								}
								error={
									errors.ventana ??
									(!ventanasPending && !ventanasDelDia.length
										? 'No tenés horario de retiro para ese día. Configuralo en Mi negocio.'
										: undefined)
								}
							>
								{props => (
									<div className="relative">
										<select
											{...props}
											value={ventana?.id ?? ''}
											disabled={!ventanasDelDia.length}
											onChange={e => set('ventanaId', e.target.value)}
											className={selectClass}
										>
											{!ventanasDelDia.length && (
												<option value="">Sin horarios</option>
											)}
											{ventanasDelDia.map(v => (
												<option key={v.id} value={v.id}>
													{ventanaLabel(v)}
												</option>
											))}
										</select>
										<ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
									</div>
								)}
							</FormField>
						</div>
						<div className="flex flex-wrap items-center gap-4 pt-2">
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="text-sm leading-5 font-bold">
									Unidades disponibles
								</span>
								<Muted className="text-[13px] leading-[18px]">
									Entre 1 y 50. Después podés subir o bajar la cantidad cuando
									quierás.
								</Muted>
							</div>
							<QuantityStepper
								label="Unidades disponibles"
								value={draft.unidades}
								min={1}
								max={50}
								onChange={n => set('unidades', n)}
							/>
						</div>
					</Panel>

					<Panel>
						<label className="flex cursor-pointer items-center gap-3 text-base">
							<input
								type="checkbox"
								checked={draft.apta}
								onChange={e => set('apta', e.target.checked)}
								aria-invalid={!!errors.apta || undefined}
								aria-describedby={errors.apta ? 'apta-error' : undefined}
								className={cn(
									'size-6 shrink-0 cursor-pointer rounded-md border-[1.5px] border-border-strong accent-[var(--border-strong)]',
									errors.apta && 'outline-2 outline-error'
								)}
							/>
							Confirmo que esta comida es apta para el consumo y no está vencida.
						</label>
						{errors.apta && (
							<p id="apta-error" className="text-sm text-error">
								{errors.apta}
							</p>
						)}
						<div className="flex flex-wrap gap-3">
							<Button
								type="submit"
								variant="brand"
								size="xl"
								disabled={publish.isPending}
							>
								{publish.isPending && <Spinner />}
								Publicar oferta
							</Button>
							<Button type="button" variant="soft" size="xl" onClick={onCancel}>
								Cancelar
							</Button>
						</div>
					</Panel>
				</div>

				<Preview
					comercio={comercio.nombre_comercial}
					nombre={draft.nombre}
					precio={precio}
					habitual={habitual}
					unidades={draft.unidades}
					ventana={ventana}
				/>
			</div>
		</form>
	);
}

const selectClass =
	'h-12 w-full cursor-pointer appearance-none rounded-xl border-[1.5px] border-input bg-card pr-11 pl-4 text-base text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-3 focus-visible:ring-selection disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-error';

type ControlProps = {
	id: string;
	'aria-invalid'?: boolean;
	'aria-describedby'?: string;
};

function FormField({
	label,
	hint,
	error,
	children
}: {
	label: string;
	hint?: ReactNode;
	error?: string;
	children: (props: ControlProps) => ReactNode;
}) {
	const id = useId();
	const messageId = `${id}-message`;
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={id} className="text-sm leading-5 font-bold">
				{label}
			</label>
			{children({
				id,
				'aria-invalid': error ? true : undefined,
				'aria-describedby': error || hint ? messageId : undefined
			})}
			{error ? (
				<p
					id={messageId}
					className="flex items-start gap-1.5 text-[13px] leading-[18px] text-error"
				>
					<TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
					{error}
				</p>
			) : (
				hint && (
					<p id={messageId} className="text-[13px] leading-[18px] text-muted-foreground">
						{hint}
					</p>
				)
			)}
		</div>
	);
}

function MoneyField({
	label,
	hint,
	value,
	onChange,
	error
}: {
	label: string;
	hint: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
}) {
	return (
		<FormField label={label} hint={hint} error={error}>
			{props => (
				<div className="relative">
					<span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base">
						C$
					</span>
					<Input
						{...props}
						inputMode="decimal"
						value={value}
						placeholder="0.00"
						onChange={e => onChange(e.target.value.replace(/[^\d.]/g, ''))}
						onBlur={() => {
							const n = parseMoney(value);
							if (Number.isFinite(n)) onChange(n.toFixed(2));
						}}
						className="pl-11"
					/>
				</div>
			)}
		</FormField>
	);
}

function TipoCard({
	selected,
	onSelect,
	title,
	description
}: {
	selected: boolean;
	onSelect: () => void;
	title: string;
	description: string;
}) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			onClick={onSelect}
			className={cn(
				'flex items-center gap-4 rounded-2xl border-[1.5px] p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
				selected
					? 'border-border-strong bg-warning-background shadow-sticker'
					: 'border-input bg-card hover:bg-secondary'
			)}
		>
			<span
				className={cn(
					'flex size-12 shrink-0 items-center justify-center rounded-xl',
					selected ? 'bg-brand' : 'bg-surface-soft'
				)}
			>
				<Gift className="size-[22px]" aria-hidden />
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="text-lg leading-[26px]">{title}</span>
				<span className="text-[13px] leading-[18px] text-muted-foreground">
					{description}
				</span>
			</span>
			<span
				className={cn(
					'flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border-strong',
					selected && 'after:size-3 after:rounded-full after:bg-border-strong'
				)}
				aria-hidden
			/>
		</button>
	);
}

function PackItems({
	items,
	onChange,
	error
}: {
	items: string[];
	onChange: (items: string[]) => void;
	error?: string;
}) {
	const [adding, setAdding] = useState(false);
	const [text, setText] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	const add = () => {
		const value = text.trim().slice(0, 60);
		if (value && !items.some(i => i.toLowerCase() === value.toLowerCase()) && items.length < 8)
			onChange([...items, value]);
		setText('');
		inputRef.current?.focus();
	};

	return (
		<div className="flex flex-col gap-2">
			<span id="pack-items-label" className="text-sm leading-5 font-bold">
				Contenido posible
			</span>
			<ul aria-labelledby="pack-items-label" className="flex flex-wrap items-center gap-2">
				{items.map(item => (
					<li
						key={item}
						className="flex h-9 items-center gap-2 rounded-full border-[1.5px] border-border-strong bg-warning-background pr-2 pl-3.5 text-sm font-medium"
					>
						{item}
						<button
							type="button"
							aria-label={`Quitar ${item}`}
							onClick={() => onChange(items.filter(i => i !== item))}
							className="flex size-6 items-center justify-center rounded-full outline-none hover:bg-brand focus-visible:ring-2 focus-visible:ring-ring"
						>
							<X className="size-4 stroke-[2.5]" />
						</button>
					</li>
				))}
				{items.length < 8 && (
					<li>
						{adding ? (
							<span className="flex items-center gap-2">
								<input
									ref={inputRef}
									autoFocus
									value={text}
									maxLength={60}
									aria-label="Algo que el pack puede traer"
									onChange={e => setText(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') {
											e.preventDefault();
											add();
										}
										if (e.key === 'Escape') setAdding(false);
									}}
									onBlur={() => {
										if (text.trim()) add();
										setAdding(false);
									}}
									placeholder="Pan dulce"
									className="h-9 w-40 rounded-full border-[1.5px] border-dashed border-border-strong bg-card px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-selection"
								/>
							</span>
						) : (
							<button
								type="button"
								onClick={() => setAdding(true)}
								className={cn(
									'flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-dashed px-3.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
									error ? 'border-error' : 'border-border-strong'
								)}
							>
								<Plus className="size-4" aria-hidden /> Agregar
							</button>
						)}
					</li>
				)}
			</ul>
			{error ? (
				<p className="text-[13px] leading-[18px] text-error">{error}</p>
			) : (
				<p className="text-[13px] leading-[18px] text-muted-foreground">
					De 3 a 8 cosas que el pack puede traer. Si conocés alérgenos, escribilos aquí
					(por ejemplo: contiene trigo, huevo y leche).
				</p>
			)}
		</div>
	);
}

function FotoPicker({
	file,
	onChange,
	error
}: {
	file: File | null;
	onChange: (file: File | null) => void;
	error?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
	const message = localError ?? error;

	return (
		<div
			className={cn(
				'flex flex-wrap items-center gap-4 rounded-2xl border-[1.5px] border-dashed p-4',
				message ? 'border-error' : 'border-input'
			)}
		>
			<span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-soft">
				{preview ? (
					<img src={preview} alt="" className="size-full object-cover" />
				) : (
					<ImageIcon className="size-6 text-muted-foreground" aria-hidden />
				)}
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="text-base font-bold">
					{file ? file.name : 'Foto del producto'}
				</span>
				<span
					className={cn(
						'text-[13px] leading-[18px]',
						message ? 'text-error' : 'text-muted-foreground'
					)}
				>
					{message ?? 'Obligatoria en ofertas específicas. JPG o PNG de hasta 5 MB.'}
				</span>
			</span>
			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png"
				className="sr-only"
				aria-label="Foto del producto"
				onChange={e => {
					const next = e.target.files?.[0] ?? null;
					e.target.value = '';
					if (next && next.size > MAX_FOTO_BYTES) {
						setLocalError('La foto pesa más de 5 MB. Elegí una más liviana.');
						return;
					}
					if (next && !/^image\/(jpeg|png)$/.test(next.type)) {
						setLocalError('Usá una foto JPG o PNG.');
						return;
					}
					setLocalError(null);
					onChange(next);
				}}
			/>
			<Button
				type="button"
				variant="soft"
				size="md"
				onClick={() => inputRef.current?.click()}
			>
				<Upload /> {file ? 'Cambiar foto' : 'Subir foto'}
			</Button>
		</div>
	);
}

function Preview({
	comercio,
	nombre,
	precio,
	habitual,
	unidades,
	ventana
}: {
	comercio: string;
	nombre: string;
	precio: number;
	habitual: number;
	unidades: number;
	ventana: VentanaRecogida | null;
}) {
	const total = Number.isFinite(precio) ? precio * unidades : 0;
	return (
		<aside className="flex flex-col gap-3 lg:sticky lg:top-6" aria-label="Vista previa">
			<p className="text-sm leading-5 font-bold">Así se verá en la app</p>
			<div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-border-strong bg-card p-2 pb-4 shadow-sticker">
				<div className="relative h-[124px] rounded-xl bg-surface-soft">
					<Chip tone="warning" className="absolute top-2 left-2 h-6 bg-brand">
						{unidades} {unidades === 1 ? 'disponible' : 'disponibles'}
					</Chip>
				</div>
				<div className="flex flex-col gap-0.5 px-2">
					<p className="text-base leading-6 font-bold">{comercio}</p>
					<p className="truncate text-sm text-info">{nombre || 'Nombre de la oferta'}</p>
					<div className="mt-1 flex items-end justify-between gap-2">
						<span className="flex items-center gap-1.5 text-[13px] leading-[18px] font-medium">
							<Clock className="size-4 shrink-0" aria-hidden />
							{ventana
								? `Retiro: ${formatClock(ventana.hora_inicio)} a ${formatClock(ventana.hora_fin)}`
								: 'Retiro: sin horario'}
						</span>
						<span className="flex shrink-0 flex-col items-end whitespace-nowrap">
							{Number.isFinite(habitual) && (
								<span className="text-[13px] text-muted-foreground line-through">
									{formatMoney(habitual)}
								</span>
							)}
							<span className="text-lg leading-6 font-bold">
								{formatMoney(Number.isFinite(precio) ? precio : 0)}
							</span>
						</span>
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-1 rounded-2xl bg-surface-soft p-3.5">
				<p className="flex items-center gap-1.5 text-sm font-bold">
					<Info className="size-4 shrink-0" aria-hidden />
					Si se retiran las {unidades}, cobrás {formatMoney(total)}
				</p>
				<p className="text-[13px] leading-[18px] text-foreground">
					Una reserva todavía no es dinero cobrado: cuenta cuando confirmás la entrega.
				</p>
			</div>
		</aside>
	);
}
