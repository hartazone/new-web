import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/** Big-number card ("3 · por retirar · C$ 240.00 por cobrar"). */
export function StatCard({
	value,
	label,
	hint,
	className
}: {
	value: ReactNode;
	label: ReactNode;
	hint?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex min-w-0 flex-col rounded-2xl border-[1.5px] border-border bg-card p-5',
				className
			)}
		>
			<span className="text-[44px] leading-[52px] font-bold tracking-[-0.03em] md:text-[56px] md:leading-[60px]">
				{value}
			</span>
			<span className="mt-1 text-lg leading-[26px] font-medium">{label}</span>
			{hint && (
				<span className="text-[13px] leading-[18px] font-medium tracking-[0.01em] text-muted-foreground">
					{hint}
				</span>
			)}
		</div>
	);
}

/** Soft cream note next to the stat cards ("Reservado no es cobrado"). */
export function NoteCard({
	title,
	children,
	className
}: {
	title: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex flex-col justify-center gap-2 rounded-2xl bg-surface-soft p-5',
				className
			)}
		>
			<p className="text-base leading-6 font-bold">{title}</p>
			<p className="text-sm leading-5 text-muted-foreground">{children}</p>
		</div>
	);
}
