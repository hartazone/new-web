import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ScanQrCode } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Chip } from '@/shared/ui/hz/chip';
import { DetailList, DetailRow } from '@/shared/ui/hz/detail-list';
import { SidePanel, SidePanelHeading } from '@/shared/ui/hz/side-panel';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { cn } from '@/shared/utils';
import {
	firstName,
	formatMoment,
	formatMoney,
	formatRange,
	formatRelativeDay,
	formatTime
} from '@/shared/utils/dates';

import type { Reserva } from './api';
import { CancelarReservaDialog } from './cancelar-reserva-dialog';
import { clienteNombre, estadoReserva, grupoDe, reservaLabel } from './model';
import { reservaQuery } from './queries';
import { CodigoBlock } from './reserva-ticket';

/**
 * Reservation detail (screens 13, 22 and 23): code, customer, amount and
 * pickup, with what happened when it is no longer pending.
 */
export function ReservaPanel({
	reserva: initial,
	onClose
}: {
	/** The row the user opened; refreshed from the API while the panel is open. */
	reserva: Reserva | null;
	onClose: () => void;
}) {
	const { data } = useQuery({
		...reservaQuery(initial?.id ?? ''),
		enabled: !!initial,
		placeholderData: initial ?? undefined
	});
	const reserva = data ?? initial;
	const [cancelOpen, setCancelOpen] = useState(false);

	return (
		<SidePanel
			open={!!initial}
			onOpenChange={open => !open && onClose()}
			title={reserva ? `Reserva ${reserva.codigo ?? ''}` : 'Reserva'}
			badges={
				reserva && (
					<Chip tone={estadoReserva(reserva).tone} icon={estadoReserva(reserva).icon}>
						{estadoReserva(reserva).label}
					</Chip>
				)
			}
		>
			{!reserva ? (
				<Skeleton className="h-64 rounded-2xl" />
			) : (
				<>
					<CodigoBlock
						codigo={reserva.codigo}
						size="lg"
						muted={grupoDe(reserva) !== 'por_retirar'}
					/>
					<SidePanelHeading>{clienteNombre(reserva)}</SidePanelHeading>
					<QuePaso reserva={reserva} />
					<ReservaDetails reserva={reserva} />
					{grupoDe(reserva) === 'por_retirar' ? (
						<div className="flex flex-wrap gap-3">
							<Button variant="brand" size="xl" asChild>
								<Link
									to="/validar"
									search={{ codigo: reserva.codigo ?? undefined }}
								>
									<ScanQrCode /> Validar entrega
								</Link>
							</Button>
							{reserva.estado.allow_cancelacion && (
								<Button
									variant="accent"
									size="xl"
									onClick={() => setCancelOpen(true)}
								>
									Cancelar reserva
								</Button>
							)}
						</div>
					) : (
						<Button variant="soft" size="xl" className="w-fit" onClick={onClose}>
							Cerrar
						</Button>
					)}
					<CancelarReservaDialog
						reserva={reserva}
						open={cancelOpen}
						onOpenChange={setCancelOpen}
						onCancelled={onClose}
					/>
				</>
			)}
		</SidePanel>
	);
}

function ReservaDetails({ reserva }: { reserva: Reserva }) {
	const grupo = grupoDe(reserva);
	const reservo = reserva.confirmada_at ?? reserva.created_at;
	return (
		<DetailList>
			<DetailRow label="Reserva">{reservaLabel(reserva)}</DetailRow>
			<DetailRow
				label={
					grupo === 'entregada'
						? 'Cobrado'
						: grupo === 'por_retirar'
							? 'Monto a cobrar'
							: 'Monto'
				}
			>
				{formatMoney(reserva.monto_total)}
				{grupo === 'por_retirar' || grupo === 'entregada' ? ' en efectivo' : ', sin cobrar'}
			</DetailRow>
			<DetailRow label="Reservó">{formatMoment(reservo)}</DetailRow>
			{reserva.cancelada_at ? (
				<DetailRow label="Canceló">{formatMoment(reserva.cancelada_at)}</DetailRow>
			) : reserva.retirada_at ? (
				<DetailRow label="Retiró">{formatMoment(reserva.retirada_at)}</DetailRow>
			) : (
				<DetailRow label="Retiro">
					{formatRelativeDay(reserva.ventana_inicio_at)},{' '}
					{formatRange(reserva.ventana_inicio_at, reserva.ventana_fin_at)}
				</DetailRow>
			)}
		</DetailList>
	);
}

/** Explanation box for reservations that ended without a delivery. */
function QuePaso({ reserva }: { reserva: Reserva }) {
	const nombre = clienteNombre(reserva);
	const quien = nombre === 'Cliente' ? 'El cliente' : firstName(nombre);
	const codigo = reserva.estado.codigo;

	if (codigo === 'expirada') {
		return (
			<Explanation tone="error" title="El cliente no llegó">
				El retiro terminó {formatRelativeDay(reserva.ventana_fin_at).toLowerCase()} a las{' '}
				{formatTime(reserva.ventana_fin_at)}
				{reserva.expirada_at &&
					` y la reserva venció a las ${formatTime(reserva.expirada_at)}`}
				. No se cobró nada y{' '}
				{reserva.cantidad === 1 ? 'la unidad no se volvió' : 'las unidades no se volvieron'}{' '}
				a vender.
				{reserva.no_show_confirmado_at && (
					<>
						{' '}
						Confirmaste que no se presentó{' '}
						{formatMoment(reserva.no_show_confirmado_at).toLowerCase()}.
					</>
				)}
			</Explanation>
		);
	}
	if (codigo === 'cancelada_usuario' && reserva.cancelada_at) {
		return (
			<Explanation tone="neutral" title="Canceló el cliente">
				{quien} canceló{' '}
				{formatMoment(reserva.cancelada_at).toLowerCase().replace(',', ' a las')}, antes del
				retiro. No se cobró nada y{' '}
				{reserva.cantidad === 1
					? 'la unidad volvió a quedar disponible'
					: 'las unidades volvieron a quedar disponibles'}{' '}
				para otra persona.
			</Explanation>
		);
	}
	if (codigo === 'cancelada_comercio' || codigo === 'cancelada_administracion') {
		return (
			<Explanation
				tone="neutral"
				title={
					codigo === 'cancelada_comercio' ? 'La cancelaste vos' : 'La canceló Hartazone'
				}
			>
				{reserva.motivo ? `Motivo: ${reserva.motivo.etiqueta}. ` : ''}
				No se cobró nada y le avisamos al cliente.
			</Explanation>
		);
	}
	return null;
}

function Explanation({
	tone,
	title,
	children
}: {
	tone: 'error' | 'neutral';
	title: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'flex flex-col gap-1.5 rounded-2xl p-4',
				tone === 'error' ? 'bg-error-background' : 'bg-neutral-background'
			)}
		>
			<p className="text-lg leading-[26px] font-medium">{title}</p>
			<p className="text-sm leading-5">{children}</p>
		</div>
	);
}
