import { ChevronRight, Clock, ImageIcon } from 'lucide-react';

import { Chip } from '@/shared/ui/hz/chip';
import { cn } from '@/shared/utils';
import { formatMoney } from '@/shared/utils/dates';

import type { Publicacion } from './api';
import { estadoOferta, retiroLabel, tipoDe, unidadesLabel } from './model';

/**
 * One square per unit: orange for reserved, yellow for available
 * (Figma "Medidor/Unidades").
 */
export function UnitsMeter({
	total,
	reservadas,
	className
}: {
	total: number;
	reservadas: number;
	className?: string;
}) {
	return (
		<div className={cn('flex flex-wrap gap-1', className)} aria-hidden>
			{Array.from({ length: Math.max(total, reservadas) }, (_, i) => (
				<span
					key={i}
					className={cn(
						'h-[18px] w-3.5 rounded-[4px] border-[1.5px] border-border-strong',
						i < reservadas ? 'bg-brand-accent' : 'bg-brand'
					)}
				/>
			))}
		</div>
	);
}

/** Photo slot of an offer (the API does not expose a public URL yet, so it is a placeholder). */
export function OfertaThumb({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				'flex size-[60px] shrink-0 items-center justify-center rounded-xl bg-surface-soft text-muted-foreground',
				className
			)}
		>
			<ImageIcon className="size-6" aria-hidden />
		</span>
	);
}

/** Offer card of "Mis ofertas" and "Tus ofertas de hoy". */
export function OfertaRow({
	publicacion,
	onOpen
}: {
	publicacion: Publicacion;
	onOpen: () => void;
}) {
	const estado = estadoOferta(publicacion);
	const kind = tipoDe(publicacion);

	return (
		<button
			type="button"
			onClick={onOpen}
			className="group flex w-full flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border-[1.5px] border-border bg-card p-3.5 text-left outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring md:flex-nowrap"
		>
			<OfertaThumb />
			<span className="flex min-w-0 flex-1 basis-60 flex-col gap-1.5">
				<span className="truncate text-lg leading-[26px] font-medium">
					{publicacion.nombre}
				</span>
				<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<Chip tone={kind.tone} icon={kind.icon}>
						{kind.label}
					</Chip>
					<span className="flex items-center gap-1.5 text-sm leading-5 text-muted-foreground">
						<Clock className="size-4 shrink-0" aria-hidden />
						{retiroLabel(publicacion)}
					</span>
				</span>
			</span>
			<span className="flex min-w-0 basis-56 flex-col gap-1">
				<UnitsMeter
					total={publicacion.cantidad_total}
					reservadas={publicacion.cantidad_reservada}
				/>
				<span className="text-sm leading-5 font-medium">
					{unidadesLabel(publicacion.cantidad_disponible, publicacion.cantidad_reservada)}
				</span>
			</span>
			<span className="ml-auto flex items-center gap-4">
				<span className="flex flex-col items-end">
					<span className="text-xl leading-7 font-bold">
						{formatMoney(publicacion.precio)}
					</span>
					<span className="text-sm leading-5 text-muted-foreground line-through">
						{formatMoney(publicacion.valor_referencia)}
					</span>
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
