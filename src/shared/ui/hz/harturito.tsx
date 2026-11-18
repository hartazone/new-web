import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/** The Hartazone mascot. */
export function Harturito({ className }: { className?: string }) {
	return (
		<img
			src="/harturito.svg"
			alt=""
			width={97}
			height={88}
			className={cn('h-[88px] w-[97px] shrink-0', className)}
		/>
	);
}

/** Harturito talking: mascot plus a speech bubble with the sticker shadow ("Mensaje/Harturito"). */
export function HarturitoMessage({
	title,
	children,
	className
}: {
	title: ReactNode;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('flex items-end gap-4', className)}>
			<Harturito />
			<div
				role="status"
				className="flex min-w-0 flex-1 flex-col gap-1 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl border-[1.5px] border-border-strong bg-card px-5 py-4 shadow-sticker"
			>
				<p className="text-lg leading-[26px] font-medium">{title}</p>
				{children && (
					<p className="text-base leading-6 text-muted-foreground">{children}</p>
				)}
			</div>
		</div>
	);
}
