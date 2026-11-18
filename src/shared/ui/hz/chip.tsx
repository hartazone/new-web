import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

export type ChipTone = 'success' | 'warning' | 'neutral' | 'error' | 'info' | 'brand';

const tones: Record<ChipTone, string> = {
	success: 'bg-success-background text-success',
	warning: 'bg-warning-background text-foreground',
	neutral: 'bg-neutral-background text-foreground',
	error: 'bg-error-background text-error',
	info: 'bg-selection text-foreground',
	brand: 'bg-surface-soft text-foreground'
};

/** Small rounded label: offer type, offer state, reservation state. */
export function Chip({
	tone = 'neutral',
	icon: Icon,
	children,
	className
}: {
	tone?: ChipTone;
	icon?: LucideIcon;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			className={cn(
				'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] leading-[18px] font-bold whitespace-nowrap',
				tones[tone],
				className
			)}
		>
			{Icon && <Icon className="size-3.5 shrink-0 stroke-[2.5]" aria-hidden />}
			{children}
		</span>
	);
}
