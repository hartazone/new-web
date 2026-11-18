import { useRef, type KeyboardEvent } from 'react';

import { cn } from '@/shared/utils';

export type SegmentItem<V extends string> = { value: V; label: string };

/**
 * Pill-shaped tabs from the design ("Hoy · Mañana · Anteriores",
 * "Por retirar (3) · Entregadas (1)…"). ARIA tablist with arrow keys.
 */
export function Segmented<V extends string>({
	items,
	value,
	onChange,
	label,
	size = 'sm',
	className
}: {
	items: SegmentItem<V>[];
	value: V;
	onChange: (value: V) => void;
	label: string;
	/** `md` is the taller variant used inside forms ("Hoy, jueves 12"). */
	size?: 'sm' | 'md';
	className?: string;
}) {
	const refs = useRef<(HTMLButtonElement | null)[]>([]);

	const onKeyDown = (e: KeyboardEvent, index: number) => {
		const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!delta) return;
		e.preventDefault();
		const next = (index + delta + items.length) % items.length;
		refs.current[next]?.focus();
		onChange(items[next].value);
	};

	return (
		<div
			role="tablist"
			aria-label={label}
			className={cn(
				'flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-neutral-background p-1',
				className
			)}
		>
			{items.map((item, i) => {
				const active = item.value === value;
				return (
					<button
						key={item.value}
						ref={el => {
							refs.current[i] = el;
						}}
						type="button"
						role="tab"
						aria-selected={active}
						tabIndex={active ? 0 : -1}
						onClick={() => onChange(item.value)}
						onKeyDown={e => onKeyDown(e, i)}
						className={cn(
							'shrink-0 rounded-lg border-[1.5px] px-3.5 text-sm leading-5 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring',
							size === 'sm' ? 'h-8' : 'h-10 flex-1 px-4',
							active
								? 'border-border-strong bg-selection font-bold text-foreground'
								: 'border-transparent font-medium text-muted-foreground hover:text-foreground'
						)}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}
