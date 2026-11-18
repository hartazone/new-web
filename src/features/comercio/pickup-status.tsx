import { useQuery } from '@tanstack/react-query';
import { Clock } from 'lucide-react';

import { useNow } from '@/shared/hooks/use-now';
import { cn } from '@/shared/utils';
import { atTime, formatTime, isoDate } from '@/shared/utils/dates';

import type { VentanaRecogida } from './api';
import { useComercio, ventanasQuery } from './session';

export type PickupState =
	{ kind: 'open'; until: Date } | { kind: 'upcoming'; from: Date } | { kind: 'closed'; at: Date };

/** Where today stands relative to the business' pickup windows. */
export function pickupState(ventanas: VentanaRecogida[], now: Date): PickupState | null {
	const today = isoDate(now);
	const windows = ventanas
		.filter(v => v.dia_semana === now.getDay())
		.map(v => ({ start: atTime(today, v.hora_inicio), end: atTime(today, v.hora_fin) }))
		.sort((a, b) => a.start.getTime() - b.start.getTime());
	if (!windows.length) return null;

	const open = windows.find(w => w.start <= now && now <= w.end);
	if (open) return { kind: 'open', until: open.end };
	const next = windows.find(w => w.start > now);
	if (next) return { kind: 'upcoming', from: next.start };
	return { kind: 'closed', at: windows[windows.length - 1].end };
}

export function usePickupState() {
	const { comercio } = useComercio();
	const now = useNow();
	const { data: ventanas } = useQuery(ventanasQuery(comercio.id));
	return ventanas ? pickupState(ventanas, now) : null;
}

/** Pill in the page header: "Retiro abierto hasta las 6:00 p. m.". */
export function PickupStatusPill({ className }: { className?: string }) {
	const state = usePickupState();
	if (!state) return null;

	const label =
		state.kind === 'open'
			? `Retiro abierto hasta las ${formatTime(state.until)}`
			: state.kind === 'upcoming'
				? `El retiro abre a las ${formatTime(state.from)}`
				: `El retiro cerró a las ${formatTime(state.at)}`;

	return (
		<span
			role="status"
			className={cn(
				'inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-border-strong px-3.5 text-sm leading-5 font-bold text-foreground md:h-12 md:px-4',
				state.kind === 'open' ? 'bg-success-background' : 'bg-neutral-background',
				className
			)}
		>
			<Clock className="size-[18px] shrink-0" aria-hidden />
			{label}
		</span>
	);
}
