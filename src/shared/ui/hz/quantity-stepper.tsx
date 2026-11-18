import { Minus, Plus } from 'lucide-react';

import { cn } from '@/shared/utils';

/** "− 10 +" control used for units (Figma: "Selector/Cantidad"). */
export function QuantityStepper({
	value,
	onChange,
	min = 0,
	max = 50,
	label,
	invalid,
	className
}: {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	/** Accessible name ("Unidades disponibles"). */
	label: string;
	invalid?: boolean;
	className?: string;
}) {
	const clamp = (n: number) => Math.min(max, Math.max(min, n));
	const button =
		'flex w-12 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40 md:w-[52px]';

	return (
		<div
			className={cn(
				'flex h-12 w-fit shrink-0 overflow-hidden rounded-xl border-[1.5px] border-border-strong bg-card md:h-[52px]',
				invalid && 'border-error',
				className
			)}
		>
			<button
				type="button"
				aria-label={`Restar una unidad a ${label}`}
				disabled={value <= min}
				onClick={() => onChange(clamp(value - 1))}
				className={cn(button, 'bg-surface-soft')}
			>
				<Minus className="size-5" />
			</button>
			<input
				type="text"
				inputMode="numeric"
				aria-label={label}
				aria-invalid={invalid || undefined}
				value={value}
				onChange={e => {
					const n = Number(e.target.value.replace(/\D/g, ''));
					onChange(clamp(Number.isFinite(n) ? n : min));
				}}
				className="w-[72px] bg-transparent text-center text-[28px] leading-none font-bold text-foreground outline-none focus-visible:bg-selection/40"
			/>
			<button
				type="button"
				aria-label={`Sumar una unidad a ${label}`}
				disabled={value >= max}
				onClick={() => onChange(clamp(value + 1))}
				className={cn(button, 'bg-brand text-primary-foreground')}
			>
				<Plus className="size-5" />
			</button>
		</div>
	);
}
