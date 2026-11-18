import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { motivosQuery } from '@/features/catalogos/queries';
import type { Schema } from '@/shared/client/api-helpers';
import { describeError } from '@/shared/models/app-error/describe-error';
import { unwrapOrThrow } from '@/shared/models/result/result';
import { Banner } from '@/shared/ui/hz/banner';
import { Muted } from '@/shared/ui/hz/panel';
import { SidePanel, SidePanelHeading } from '@/shared/ui/hz/side-panel';
import { DialogActions, StickerDialog } from '@/shared/ui/hz/sticker-dialog';
import { toast } from '@/shared/ui/hz/toast';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Spinner } from '@/shared/ui/primitives/spinner';
import { cn } from '@/shared/utils';
import { addDays, isoDate } from '@/shared/utils/dates';

import { comercioApi, type Comercio, type ComercioHorario, type VentanaRecogida } from './api';
import { DIAS, SEMANA } from './horario';
import { comercioKeys, horariosQuery, ventanasQuery } from './session';

const textareaClass =
	'w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-3 focus-visible:ring-selection';
/** `HH:MM:SS` → `HH:MM` for `<input type="time">`. */
const hhmm = (time: string | null | undefined) => (time ?? '').slice(0, 5);

function Labeled({
	label,
	hint,
	htmlFor,
	children
}: {
	label: string;
	hint?: ReactNode;
	htmlFor: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={htmlFor} className="text-sm leading-5 font-bold">
				{label}
			</label>
			{children}
			{hint && <p className="text-[13px] leading-[18px] text-muted-foreground">{hint}</p>}
		</div>
	);
}

/** CU-C-11: description, arrival directions and public phone (published right away). */
export function FichaPanel({
	comercio,
	open,
	onOpenChange
}: {
	comercio: Comercio;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [descripcion, setDescripcion] = useState(comercio.descripcion);
	const [llegada, setLlegada] = useState(comercio.referencias_llegada);
	const [telefono, setTelefono] = useState(comercio.telefono_publico);

	const save = useMutation({
		mutationFn: () =>
			unwrapOrThrow(
				comercioApi.update(comercio.id, {
					descripcion: descripcion.trim(),
					referencias_llegada: llegada.trim(),
					telefono_publico: telefono.trim()
				})
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: comercioKeys.all });
			toast('Listo. La ficha ya se ve así en la app.');
			onOpenChange(false);
		}
	});

	return (
		<SidePanel open={open} onOpenChange={onOpenChange} title="Cambiar ficha">
			<SidePanelHeading>Ficha en la app</SidePanelHeading>
			<Muted>Los cambios se publican apenas los guardás.</Muted>
			<Labeled
				label="Descripción"
				htmlFor="ficha-descripcion"
				hint={`${descripcion.length} de 300 caracteres.`}
			>
				<textarea
					id="ficha-descripcion"
					rows={4}
					maxLength={300}
					value={descripcion}
					onChange={e => setDescripcion(e.target.value)}
					placeholder="Panadería de barrio con pan dulce y salado hecho cada mañana."
					className={textareaClass}
				/>
			</Labeled>
			<Labeled
				label="Cómo llegar"
				htmlFor="ficha-llegada"
				hint={`${llegada.length} de 150 caracteres.`}
			>
				<textarea
					id="ficha-llegada"
					rows={2}
					maxLength={150}
					value={llegada}
					onChange={e => setLlegada(e.target.value)}
					placeholder="Frente al parque, portón verde."
					className={textareaClass}
				/>
			</Labeled>
			<Labeled label="Teléfono para clientes" htmlFor="ficha-telefono" hint="Opcional.">
				<Input
					id="ficha-telefono"
					type="tel"
					maxLength={20}
					value={telefono}
					onChange={e => setTelefono(e.target.value)}
					placeholder="8888 8888"
				/>
			</Labeled>
			{save.isError && <Banner tone="error">{describeError(save.error)}</Banner>}
			<div className="flex flex-wrap gap-3">
				<Button
					variant="brand"
					size="xl"
					disabled={save.isPending}
					onClick={() => save.mutate()}
				>
					{save.isPending && <Spinner />}
					Guardar ficha
				</Button>
				<Button variant="soft" size="xl" onClick={() => onOpenChange(false)}>
					Cancelar
				</Button>
			</div>
			<p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
				El nombre, la categoría y la dirección los revisa Hartazone antes de cambiarlos en
				la app.
			</p>
		</SidePanel>
	);
}

type DiaDraft = { id: string; cerrado: boolean; apertura: string; cierre: string };

/** CU-C-13: opening and closing time for each day, or closed. */
export function HorarioPanel({
	comercioId,
	open,
	onOpenChange
}: {
	comercioId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: horarios = [], isPending } = useQuery({
		...horariosQuery(comercioId),
		enabled: open
	});
	return (
		<SidePanel open={open} onOpenChange={onOpenChange} title="Horario de atención">
			<SidePanelHeading>Horario de atención</SidePanelHeading>
			<Muted>
				Ningún retiro puede quedar fuera de este horario. Un día no puede pasar de la
				medianoche.
			</Muted>
			{isPending ? (
				<Spinner className="size-6" />
			) : !horarios.length ? (
				<Banner tone="warning">
					Tu horario todavía no está cargado. Escribile al equipo de Hartazone para
					configurarlo.
				</Banner>
			) : (
				<HorarioForm
					key={horarios.map(h => h.id).join()}
					comercioId={comercioId}
					horarios={horarios}
					onDone={() => onOpenChange(false)}
				/>
			)}
		</SidePanel>
	);
}

function HorarioForm({
	comercioId,
	horarios,
	onDone
}: {
	comercioId: string;
	horarios: ComercioHorario[];
	onDone: () => void;
}) {
	const queryClient = useQueryClient();
	const [days, setDays] = useState<Record<number, DiaDraft>>(() =>
		Object.fromEntries(
			horarios.map(h => [
				h.dia_semana,
				{
					id: h.id,
					cerrado: h.cerrado,
					apertura: hhmm(h.hora_apertura),
					cierre: hhmm(h.hora_cierre)
				}
			])
		)
	);

	const save = useMutation({
		mutationFn: async () => {
			for (const h of horarios) {
				const d = days[h.dia_semana];
				const changed =
					d.cerrado !== h.cerrado ||
					d.apertura !== hhmm(h.hora_apertura) ||
					d.cierre !== hhmm(h.hora_cierre);
				if (!changed) continue;
				await unwrapOrThrow(
					comercioApi.updateHorario(comercioId, h.id, {
						cerrado: d.cerrado,
						hora_apertura: d.cerrado ? null : `${d.apertura}:00`,
						hora_cierre: d.cerrado ? null : `${d.cierre}:00`
					})
				);
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: comercioKeys.horarios(comercioId) });
			toast('Horario de atención guardado.');
			onDone();
		},
		onError: () =>
			void queryClient.invalidateQueries({ queryKey: comercioKeys.horarios(comercioId) })
	});

	const invalid = Object.values(days).some(
		d => !d.cerrado && (!d.apertura || !d.cierre || d.apertura >= d.cierre)
	);

	return (
		<>
			<ul className="flex flex-col gap-2">
				{SEMANA.filter(d => days[d]).map(d => {
					const day = days[d];
					const set = (patch: Partial<DiaDraft>) =>
						setDays(prev => ({ ...prev, [d]: { ...prev[d], ...patch } }));
					const wrong =
						!day.cerrado && day.apertura && day.cierre && day.apertura >= day.cierre;
					return (
						<li
							key={d}
							className="flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-border bg-card px-4 py-3"
						>
							<span className="w-24 text-base font-bold capitalize">{DIAS[d]}</span>
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={!day.cerrado}
									onChange={e => set({ cerrado: !e.target.checked })}
									className="size-5 accent-[var(--border-strong)]"
								/>
								Abierto
							</label>
							{!day.cerrado && (
								<span className="ml-auto flex items-center gap-2">
									<Input
										type="time"
										aria-label={`Abre el ${DIAS[d]}`}
										value={day.apertura}
										onChange={e => set({ apertura: e.target.value })}
										aria-invalid={!!wrong || undefined}
										className="h-10 w-32 px-3"
									/>
									a
									<Input
										type="time"
										aria-label={`Cierra el ${DIAS[d]}`}
										value={day.cierre}
										onChange={e => set({ cierre: e.target.value })}
										aria-invalid={!!wrong || undefined}
										className="h-10 w-32 px-3"
									/>
								</span>
							)}
						</li>
					);
				})}
			</ul>
			{invalid && (
				<Banner tone="error">
					La hora de cierre tiene que ser después de la de apertura.
				</Banner>
			)}
			{save.isError && <Banner tone="error">{describeError(save.error)}</Banner>}
			<div className="flex flex-wrap gap-3">
				<Button
					variant="brand"
					size="xl"
					disabled={invalid || save.isPending}
					onClick={() => save.mutate()}
				>
					{save.isPending && <Spinner />}
					Guardar horario
				</Button>
				<Button variant="soft" size="xl" onClick={onDone}>
					Cancelar
				</Button>
			</div>
		</>
	);
}

type VentanaDraft = { id?: string; dia: number; etiqueta: string; inicio: string; fin: string };

/** CU-C-14: pickup windows per day, used by every new offer. */
export function VentanasPanel({
	comercioId,
	open,
	onOpenChange
}: {
	comercioId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: ventanas = [], isPending } = useQuery({
		...ventanasQuery(comercioId),
		enabled: open
	});
	return (
		<SidePanel open={open} onOpenChange={onOpenChange} title="Horario de retiro">
			<SidePanelHeading>Horario de retiro</SidePanelHeading>
			<Muted>
				Se usa en cada oferta nueva. Tiene que quedar dentro del horario de atención y las
				reservas cierran 15 minutos antes de que termine.
			</Muted>
			{isPending ? (
				<Spinner className="size-6" />
			) : (
				<VentanasForm
					key={ventanas.map(v => v.id).join()}
					comercioId={comercioId}
					ventanas={ventanas}
					onDone={() => onOpenChange(false)}
				/>
			)}
		</SidePanel>
	);
}

function VentanasForm({
	comercioId,
	ventanas,
	onDone
}: {
	comercioId: string;
	ventanas: VentanaRecogida[];
	onDone: () => void;
}) {
	const queryClient = useQueryClient();
	const [rows, setRows] = useState<VentanaDraft[]>(() =>
		ventanas
			.map(v => ({
				id: v.id,
				dia: v.dia_semana,
				etiqueta: v.etiqueta,
				inicio: hhmm(v.hora_inicio),
				fin: hhmm(v.hora_fin)
			}))
			.sort(
				(a, b) =>
					SEMANA.indexOf(a.dia) - SEMANA.indexOf(b.dia) ||
					a.inicio.localeCompare(b.inicio)
			)
	);

	const save = useMutation({
		mutationFn: async () => {
			for (const row of rows) {
				const body = {
					dia_semana: row.dia,
					etiqueta: row.etiqueta.trim() || 'Retiro',
					hora_inicio: `${row.inicio}:00`,
					hora_fin: `${row.fin}:00`
				};
				const original = ventanas.find(v => v.id === row.id);
				if (!original) {
					await unwrapOrThrow(
						comercioApi.createVentana({ comercio_id: comercioId, ...body })
					);
				} else if (
					original.dia_semana !== body.dia_semana ||
					original.etiqueta !== body.etiqueta ||
					hhmm(original.hora_inicio) !== row.inicio ||
					hhmm(original.hora_fin) !== row.fin
				) {
					await unwrapOrThrow(comercioApi.updateVentana(comercioId, original.id, body));
				}
			}
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: comercioKeys.ventanas(comercioId) }),
		onSuccess: () => {
			toast('Horario de retiro guardado.');
			onDone();
		}
	});

	const set = (i: number, patch: Partial<VentanaDraft>) =>
		setRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
	const invalid = rows.some(r => !r.inicio || !r.fin || r.inicio >= r.fin);

	return (
		<>
			<ul className="flex flex-col gap-2">
				{rows.map((row, i) => (
					<li
						key={row.id ?? `nueva-${i}`}
						className="flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-border bg-card px-4 py-3"
					>
						<select
							aria-label="Día"
							value={row.dia}
							onChange={e => set(i, { dia: Number(e.target.value) })}
							className="h-10 rounded-xl border-[1.5px] border-input bg-card px-3 text-base capitalize"
						>
							{SEMANA.map(d => (
								<option key={d} value={d}>
									{DIAS[d]}
								</option>
							))}
						</select>
						<Input
							aria-label="Nombre de la ventana"
							value={row.etiqueta}
							maxLength={40}
							onChange={e => set(i, { etiqueta: e.target.value })}
							placeholder="Cierre"
							className="h-10 w-32 px-3"
						/>
						<span className="ml-auto flex items-center gap-2">
							<Input
								type="time"
								aria-label="Empieza"
								value={row.inicio}
								onChange={e => set(i, { inicio: e.target.value })}
								className="h-10 w-32 px-3"
							/>
							a
							<Input
								type="time"
								aria-label="Termina"
								value={row.fin}
								onChange={e => set(i, { fin: e.target.value })}
								className="h-10 w-32 px-3"
							/>
						</span>
					</li>
				))}
			</ul>
			<Button
				variant="soft"
				size="md"
				className="w-fit"
				onClick={() =>
					setRows(prev => [
						...prev,
						{
							dia: prev[prev.length - 1]?.dia ?? 1,
							etiqueta: 'Cierre',
							inicio: '17:00',
							fin: '18:00'
						}
					])
				}
			>
				<Plus /> Agregar horario
			</Button>
			{invalid && (
				<Banner tone="error">Cada horario tiene que terminar después de empezar.</Banner>
			)}
			{save.isError && <Banner tone="error">{describeError(save.error)}</Banner>}
			<div className="flex flex-wrap gap-3">
				<Button
					variant="brand"
					size="xl"
					disabled={invalid || save.isPending}
					onClick={() => save.mutate()}
				>
					{save.isPending && <Spinner />}
					Guardar horario
				</Button>
				<Button variant="soft" size="xl" onClick={onDone}>
					Cancelar
				</Button>
			</div>
		</>
	);
}

type Duracion = Schema<'TipoDuracionPausa'>;

/** CU-C-16: hides the business from the map and stops new reservations. */
export function PausaDialog({
	comercioId,
	open,
	onOpenChange
}: {
	comercioId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const { data: motivos = [] } = useQuery({ ...motivosQuery('pausa_comercio'), enabled: open });
	const [duracion, setDuracion] = useState<Duracion>('hoy');
	const [hasta, setHasta] = useState(isoDate(addDays(new Date(), 1)));
	const [motivoId, setMotivoId] = useState('');

	const pausar = useMutation({
		mutationFn: () => {
			const now = new Date();
			const fin =
				duracion === 'hoy'
					? new Date(`${isoDate(now)}T23:59:59`)
					: duracion === 'hasta_fecha'
						? new Date(`${hasta}T23:59:59`)
						: null;
			return unwrapOrThrow(
				comercioApi.pausar({
					comercio_id: comercioId,
					tipo_duracion: duracion,
					inicio_at: now.toISOString(),
					fin_at: fin?.toISOString() ?? null,
					motivo_id: motivoId || null,
					nota: ''
				})
			);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: comercioKeys.all });
			toast('Pausaste el negocio. Ya no aparece en la app.');
			onOpenChange(false);
		}
	});

	const options: { value: Duracion; label: string }[] = [
		{ value: 'hoy', label: 'Por hoy' },
		{ value: 'hasta_fecha', label: 'Hasta una fecha' },
		{ value: 'indefinida', label: 'Hasta que lo reactive' }
	];

	return (
		<StickerDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Pausar el negocio"
			description="Tu negocio deja de verse en la app, no se generan ofertas y no entran reservas nuevas."
		>
			<fieldset className="flex flex-col gap-1">
				<legend className="mb-2 text-sm font-bold">¿Por cuánto tiempo?</legend>
				{options.map(o => (
					<label
						key={o.value}
						className={cn(
							'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-4',
							duracion === o.value ? 'bg-selection font-bold' : 'hover:bg-secondary'
						)}
					>
						<input
							type="radio"
							name="duracion-pausa"
							checked={duracion === o.value}
							onChange={() => setDuracion(o.value)}
							className="size-5 accent-[var(--border-strong)]"
						/>
						{o.label}
					</label>
				))}
			</fieldset>
			{duracion === 'hasta_fecha' && (
				<Labeled label="Hasta el" htmlFor="pausa-hasta">
					<Input
						id="pausa-hasta"
						type="date"
						min={isoDate(addDays(new Date(), 1))}
						value={hasta}
						onChange={e => setHasta(e.target.value)}
					/>
				</Labeled>
			)}
			{motivos.length > 0 && (
				<Labeled label="Motivo" htmlFor="pausa-motivo">
					<select
						id="pausa-motivo"
						value={motivoId}
						onChange={e => setMotivoId(e.target.value)}
						className="h-12 rounded-xl border-[1.5px] border-input bg-card px-4 text-base"
					>
						<option value="">Sin motivo</option>
						{motivos.map(m => (
							<option key={m.id} value={m.id}>
								{m.etiqueta}
							</option>
						))}
					</select>
				</Labeled>
			)}
			{pausar.isError && <Banner tone="error">{describeError(pausar.error)}</Banner>}
			<DialogActions>
				<Button
					variant="brand"
					size="md"
					disabled={pausar.isPending}
					onClick={() => pausar.mutate()}
				>
					{pausar.isPending && <Spinner />}
					Pausar negocio
				</Button>
				<Button variant="soft" size="md" onClick={() => onOpenChange(false)}>
					Volver
				</Button>
			</DialogActions>
		</StickerDialog>
	);
}
