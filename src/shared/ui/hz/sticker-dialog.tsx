import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * Modal with the "sticker" look of the design: white card, strong border
 * and a solid shadow below. Used for confirmations and short forms.
 */
export function StickerDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	className
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-[55] bg-foreground/45 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					className={cn(
						'fixed top-1/2 left-1/2 z-[56] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl border-[1.5px] border-border-strong bg-card p-6 text-foreground shadow-sticker',
						'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none',
						className
					)}
				>
					<DialogPrimitive.Title className="font-serif text-xl leading-7 md:text-[22px]">
						{title}
					</DialogPrimitive.Title>
					{description && (
						<DialogPrimitive.Description className="text-base leading-6 text-muted-foreground">
							{description}
						</DialogPrimitive.Description>
					)}
					{children}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

/** Row of dialog buttons. */
export function DialogActions({ children }: { children: ReactNode }) {
	return <div className="flex flex-wrap items-center gap-3 pt-1">{children}</div>;
}
