import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/** Label/value rows inside a white card ("Monto a cobrar · C$ 120.00 en efectivo"). */
export function DetailList({
	children,
	footnote,
	className
}: {
	children: ReactNode;
	/** Small bold note under the rows ("El precio queda fijo porque…"). */
	footnote?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex flex-col gap-3 rounded-2xl border-[1.5px] border-border bg-card px-4 py-4 md:px-5',
				className
			)}
		>
			<dl className="flex flex-col gap-3">{children}</dl>
			{footnote && (
				<p className="text-[13px] leading-[18px] font-medium tracking-[0.01em] text-muted-foreground">
					{footnote}
				</p>
			)}
		</div>
	);
}

export function DetailRow({ label, children }: { label: ReactNode; children: ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<dt className="text-sm leading-5 text-muted-foreground">{label}</dt>
			<dd className="text-right text-base leading-6 font-bold">{children}</dd>
		</div>
	);
}
