import { useQuery } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { useComercio } from '@/features/comercio/session';
import { useBeforeUnload } from '@/shared/hooks/use-before-unload';
import { describeError } from '@/shared/models/app-error/describe-error';
import { Banner } from '@/shared/ui/hz/banner';
import { Chip } from '@/shared/ui/hz/chip';
import { DetailList, DetailRow } from '@/shared/ui/hz/detail-list';
import { Muted } from '@/shared/ui/hz/panel';
import { QuantityStepper } from '@/shared/ui/hz/quantity-stepper';
import { SidePanel, SidePanelHeading } from '@/shared/ui/hz/side-panel';
import { DialogActions, StickerDialog } from '@/shared/ui/hz/sticker-dialog';
import { toast } from '@/shared/ui/hz/toast';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { Spinner } from '@/shared/ui/primitives/spinner';
import { formatMoney, formatRange, formatRelativeDay, formatTime } from '@/shared/utils/dates';

import type { Publicacion } from './api';
import { admiteAjuste, estadoOferta, tipoDe } from './model';
import { publicacionQuery, useDeclararAptitud, useUpdatePublicacion } from './queries';

/**
 * Detail of one offer (screens 08, 08c, 09 and 29): adjust today's units,
 * stop receiving reservations, and protect unsaved changes on close.
 */
export function OfertaPanel({
	publicacionId,
	onClose
}: {
	publicacionId: string | null;
	onClose: () => void;
}) {
	const { comercio } = useComercio();
	// While the draft has unsaved units, closing asks first (screen 29).
	const closeGuardRef = useRef<(() => void) | null>(null);
	const { data, isPending } = useQuery({
		...publicacionQuery(comercio.id, publicacionId ?? ''),
		enabled: !!publicacionId
	});

	return (
		<SidePanel
			open={!!publicacionId}
			onOpenChange={open => {
				if (open) return;
				if (closeGuardRef.current) closeGuardRef.current();
				else onClose();
			}}
			title={data?.nombre ?? 'Oferta'}
			badges={
				data && (
					<>
						<Chip tone={tipoDe(data).tone} icon={tipoDe(data).icon}>
							{tipoDe(data).label}
						</Chip>
						<Chip tone={estadoOferta(data).tone} icon={estadoOferta(data).icon}>
							{estadoOferta(data).label}
						</Chip>
					</>
				)
			}
		>
			{isPending || !data ? (
				<div className="flex flex-col gap-4">
					<Skeleton className="h-9 w-2/3" />
					<Skeleton className="h-40 rounded-2xl" />
					<Skeleton className="h-40 rounded-2xl" />
				</div>
			) : (
				// Keyed so a different offer starts with a clean draft.
				<OfertaDetail
					key={data.id}
					publicacion={data}
					onClose={onClose}
					closeGuardRef={closeGuardRef}
				/>
			)}
		</SidePanel>
	);
}

function OfertaDetail({
	publicacion,
	onClose,
	closeGuardRef
}: {
	publicacion: Publicacion;
	onClose: () => void;
	closeGuardRef: RefObject<(() => void) | null>;
}) {
	const { comercio, membership } = useComercio();
	const update = useUpdatePublicacion(comercio.id);
	const aptitud = useDeclararAptitud(comercio.id);
	const [units, setUnits] = useState(publicacion.cantidad_total);
	const [confirmStop, setConfirmStop] = useState(false);
	const [confirmLeave, setConfirmLeave] = useState(false);

	const dirty = units !== publicacion.cantidad_total;
	const editable = admiteAjuste(publicacion);
	const reservadas = publicacion.cantidad_reservada;
	const canStop = editable && publicacion.cantidad_disponible > 0;

	const save = (cantidad: number, message: string, after?: () => void) =>
		update.mutate(
			{ id: publicacion.id, body: { cantidad_total: cantidad } },
			{
				onSuccess: updated => {
					setUnits(updated.cantidad_total);
					toast(message);
					after?.();
				}
			}
		);

	const saveUnits = (after?: () => void) =>
		save(units, `Guardado. ${publicacion.nombre} tiene ${units} unidades.`, after);

	useEffect(() => {
		closeGuardRef.current = dirty ? () => setConfirmLeave(true) : null;
		return () => {
			closeGuardRef.current = null;
		};
	}, [dirty, closeGuardRef]);
	useBeforeUnload(dirty);

	return (
		<>
			<div className="flex flex-col gap-3">
				<SidePanelHeading>{publicacion.nombre}</SidePanelHeading>
				{publicacion.descripcion && <Muted>{publicacion.descripcion}</Muted>}
			</div>

			{!publicacion.aptitud_declarada_at && editable && (
				<div className="flex flex-col gap-3 rounded-2xl bg-warning-background p-4">
					<p className="text-base font-bold">Falta confirmar que la comida es apta</p>
					<Muted className="text-foreground">
						Hasta que lo confirmés, la oferta no se abre a reservas.
					</Muted>
					{aptitud.isError && (
						<Banner tone="error">{describeError(aptitud.error)}</Banner>
					)}
					<Button
						variant="brand"
						size="md"
						className="w-fit"
						disabled={!membership || aptitud.isPending}
						onClick={() =>
							membership &&
							aptitud.mutate(
								{ id: publicacion.id, usuarioComercioId: membership.id },
								{
									onSuccess: () =>
										toast(`${publicacion.nombre} ya se puede reservar.`)
								}
							)
						}
					>
						{aptitud.isPending && <Spinner />}
						Confirmo que es apta y no está vencida
					</Button>
				</div>
			)}

			<section className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-border bg-card p-4 md:p-5">
				<div className="flex items-center gap-4">
					<div className="flex flex-1 flex-col">
						<p className="text-lg leading-[26px] font-medium">
							Unidades de{' '}
							{formatRelativeDay(publicacion.fecha_operativa).toLowerCase()}
						</p>
						<Muted>
							Total que publicaste
							{dirty ? `. Antes eran ${publicacion.cantidad_total}.` : '.'}
						</Muted>
					</div>
					<QuantityStepper
						label="Unidades publicadas"
						value={units}
						onChange={setUnits}
						min={reservadas}
						max={50}
						className={editable ? undefined : 'pointer-events-none opacity-60'}
					/>
				</div>
				<dl className="flex flex-col gap-2 pt-1">
					<div className="flex justify-between text-sm">
						<dt className="text-muted-foreground">Reservadas</dt>
						<dd className="font-bold">{reservadas}</dd>
					</div>
					<div className="flex justify-between text-sm">
						<dt className="text-muted-foreground">Disponibles para reservar</dt>
						<dd className="font-bold">{Math.max(units - reservadas, 0)}</dd>
					</div>
				</dl>
				{reservadas > 0 && (
					<p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
						No podés bajar de {reservadas}:{' '}
						{reservadas === 1
							? 'esa unidad ya está reservada.'
							: 'esas unidades ya están reservadas.'}
					</p>
				)}
			</section>

			{dirty && (
				<>
					<Banner tone="warning" icon={TriangleAlert}>
						Tenés cambios sin guardar en esta oferta.
					</Banner>
					<div className="flex flex-wrap gap-3">
						<Button
							variant="brand"
							size="xl"
							disabled={update.isPending}
							onClick={() => saveUnits()}
						>
							{update.isPending && <Spinner />}
							Guardar cambios
						</Button>
						<Button
							variant="soft"
							size="xl"
							onClick={() => setUnits(publicacion.cantidad_total)}
						>
							Cancelar
						</Button>
					</div>
				</>
			)}
			{update.isError && <Banner tone="error">{describeError(update.error)}</Banner>}

			<DetailList
				footnote={
					reservadas > 0 ? 'El precio queda fijo porque ya hay una reserva.' : undefined
				}
			>
				<DetailRow label="Precio Hartazone">{formatMoney(publicacion.precio)}</DetailRow>
				<DetailRow label="Precio habitual">
					{formatMoney(publicacion.valor_referencia)}
				</DetailRow>
				<DetailRow label="Retiro">
					{formatRelativeDay(publicacion.ventana_inicio_at)},{' '}
					{formatRange(publicacion.ventana_inicio_at, publicacion.ventana_fin_at)}
				</DetailRow>
				<DetailRow label="Se puede reservar hasta">
					{formatTime(publicacion.reservas_cierran_at)}
				</DetailRow>
			</DetailList>

			{canStop && (
				<div className="flex flex-col gap-3 pt-2">
					<Muted>
						¿Ya no te queda más? Dejá de recibir reservas. La oferta se muestra como
						agotada y lo ya reservado se entrega igual.
					</Muted>
					<Button
						variant="soft"
						size="xl"
						className="w-fit"
						onClick={() => setConfirmStop(true)}
					>
						Dejar de recibir reservas
					</Button>
				</div>
			)}

			<StickerDialog
				open={confirmStop}
				onOpenChange={setConfirmStop}
				title={`¿Dejar de recibir reservas de ${publicacion.nombre}?`}
				description={
					reservadas > 0
						? `La oferta se va a mostrar como agotada en la app. ${
								reservadas === 1
									? 'La reserva que ya tenés, de 1 unidad, sigue en pie y hay que entregarla.'
									: `Las ${reservadas} unidades ya reservadas siguen en pie y hay que entregarlas.`
							}`
						: 'La oferta se va a mostrar como agotada en la app.'
				}
			>
				<DialogActions>
					<Button
						variant="brand"
						size="md"
						disabled={update.isPending}
						onClick={() =>
							// CU-C-25: total = reserved, so availability drops to zero without cancelling anything.
							save(reservadas, `${publicacion.nombre} ya no recibe reservas.`, () => {
								setConfirmStop(false);
								onClose();
							})
						}
					>
						{update.isPending && <Spinner />}
						Dejar de recibir reservas
					</Button>
					<Button variant="soft" size="md" onClick={() => setConfirmStop(false)}>
						Volver
					</Button>
				</DialogActions>
			</StickerDialog>

			<StickerDialog
				open={confirmLeave}
				onOpenChange={setConfirmLeave}
				title="Tenés cambios sin guardar"
				description={`${units > publicacion.cantidad_total ? 'Subiste' : 'Bajaste'} ${
					publicacion.nombre
				} de ${publicacion.cantidad_total} a ${units} unidades. Si salís ahora, la oferta sigue con ${
					publicacion.cantidad_total
				}.`}
			>
				<DialogActions>
					<Button
						variant="brand"
						size="md"
						disabled={update.isPending}
						onClick={() =>
							saveUnits(() => {
								setConfirmLeave(false);
								onClose();
							})
						}
					>
						{update.isPending && <Spinner />}
						Guardar cambios
					</Button>
					<Button
						variant="soft"
						size="md"
						onClick={() => {
							setConfirmLeave(false);
							onClose();
						}}
					>
						Salir sin guardar
					</Button>
				</DialogActions>
			</StickerDialog>
		</>
	);
}
