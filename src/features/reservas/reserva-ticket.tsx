import { ChevronRight } from 'lucide-react';

import { Chip } from '@/shared/ui/hz/chip';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { cn } from '@/shared/utils';
import { formatMoney } from '@/shared/utils/dates';

import type { Reserva } from './api';
import { clienteNombre, estadoReserva, formatCodigo, grupoDe, reservaLabel } from './model';

/** Code block on the left of a ticket and at the top of the reservation panel. */
export function CodigoBlock({
	codigo,
	muted,
	size = 'sm',
	className
}: {
	codigo: string | null;
	/** Grey for reservations that are no longer pending. */
	muted?: boolean;
	size?: 'sm' | 'lg';
	className?: string;
}) {
	return (
		<span
			className={cn(
				'flex flex-col justify-center',
				muted ? 'bg-neutral-background' : 'bg-brand',
				size === 'lg'
					? 'rounded-2xl border-[1.5px] border-border-strong px-5 py-3'
					: 'px-4 py-3 md:px-5',
				className
			)}
		>
			<span className="text-[13px] leading-[18px] font-medium tracking-[0.01em]">
				{size === 'lg' ? 'Código de retiro' : 'Código'}
			</span>
			<span
				className={cn(
					'font-bold tracking-[0.02em] whitespace-nowrap',
					size === 'lg' ? 'text-[28px] leading-9' : 'text-xl leading-7'
				)}
			>
				{formatCodigo(codigo)}
			</span>
		</span>
	);
}

/** Reservation ticket ("Código K7M 2QD · María López · C$ 120.00 · Por retirar"). */
export function ReservaTicket({ reserva, onOpen }: { reserva: Reserva; onOpen: () => void }) {
	const estado = estadoReserva(reserva);
	const pendiente = grupoDe(reserva) === 'por_retirar';
	const cobrada = grupoDe(reserva) === 'entregada';

	return (
		<button
			type="button"
			onClick={onOpen}
			className="group flex w-full overflow-hidden rounded-2xl border-[1.5px] border-border-strong bg-card text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<CodigoBlock
				codigo={reserva.codigo}
				muted={!pendiente && !cobrada}
				className="w-[118px] shrink-0 border-r-[1.5px] border-dashed border-border-strong md:w-[160px]"
			/>
			<span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-5">
				<span className="flex min-w-0 flex-1 basis-40 flex-col">
					<span className="truncate text-base leading-6 font-bold">
						{clienteNombre(reserva)}
					</span>
					<span className="truncate text-sm leading-5 text-muted-foreground">
						{reservaLabel(reserva)}
					</span>
				</span>
				<span className="flex flex-col items-end">
					<span className="text-xl leading-7 font-bold">
						{pendiente || cobrada ? formatMoney(reserva.monto_total) : 'Sin cobro'}
					</span>
					{(pendiente || cobrada) && (
						<span className="text-[13px] leading-[18px] text-muted-foreground">
							{pendiente ? 'a cobrar en efectivo' : 'cobrado en efectivo'}
						</span>
					)}
				</span>
				<Chip tone={estado.tone} icon={estado.icon}>
					{estado.label}
				</Chip>
				<ChevronRight
					className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground"
					aria-hidden
				/>
			</span>
		</button>
	);
}

/** Placeholder rows while today's reservations load (screen 27). */
export function ReservaTicketSkeleton({ faded }: { faded?: boolean }) {
	return (
		<div
			className={cn(
				'flex h-[78px] overflow-hidden rounded-2xl border-[1.5px] border-border bg-card',
				faded && 'opacity-50'
			)}
			aria-hidden
		>
			<Skeleton className="h-full w-[118px] shrink-0 rounded-none md:w-[136px]" />
			<div className="flex flex-1 flex-col justify-center gap-2.5 px-4">
				<Skeleton className="h-3.5 w-36" />
				<Skeleton className="h-3 w-48" />
			</div>
		</div>
	);
}
