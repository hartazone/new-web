import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/shared/utils';

/** White card with the soft border of the design ("Antes de publicar", "Hoy"…). */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
	return (
		<section
			className={cn(
				'flex flex-col gap-4 rounded-2xl border-[1.5px] border-border bg-card p-5 md:p-6',
				className
			)}
			{...props}
		/>
	);
}

/** "Texto/20 Bold" heading of a panel, with an optional action on the right. */
export function PanelTitle({
	children,
	action,
	as: Tag = 'h2',
	className
}: {
	children: ReactNode;
	action?: ReactNode;
	as?: 'h2' | 'h3';
	className?: string;
}) {
	return (
		<div className={cn('flex items-center gap-4', className)}>
			<Tag className="flex-1 text-xl leading-7 font-bold">{children}</Tag>
			{action}
		</div>
	);
}

/** "Texto/14 Regular" secondary paragraph. */
export function Muted({ className, ...props }: ComponentProps<'p'>) {
	return <p className={cn('text-sm leading-5 text-muted-foreground', className)} {...props} />;
}
