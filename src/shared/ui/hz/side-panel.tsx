import { X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

/**
 * Right-hand detail panel from the design ("panel/oferta", "panel/reserva"):
 * 560px wide, cream background, strong left border and a round close button.
 * `onOpenChange(false)` fires on every close attempt, so the page can
 * intercept it (unsaved changes).
 */
export function SidePanel({
	open,
	onOpenChange,
	title,
	badges,
	children
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Accessible title; render the visible one yourself if it needs styling. */
	title: string;
	badges?: ReactNode;
	children: ReactNode;
}) {
	return (
		<SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<SheetPrimitive.Portal>
				<SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/45 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<SheetPrimitive.Content
					aria-describedby={undefined}
					className={cn(
						'fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l-[1.5px] border-border-strong bg-background text-foreground sm:max-w-[560px]',
						'data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=closed]:slide-out-to-right',
						'data-[state=open]:animate-in data-[state=open]:duration-300 data-[state=open]:slide-in-from-right motion-reduce:animate-none'
					)}
				>
					<div className="flex flex-col gap-5 px-5 pt-6 pb-10 md:px-8">
						<div className="flex min-h-12 items-start gap-2">
							<div className="flex flex-1 flex-wrap items-center gap-2">{badges}</div>
							<SheetPrimitive.Close
								aria-label="Cerrar"
								className="flex size-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong bg-card text-error outline-none hover:bg-error-background focus-visible:ring-2 focus-visible:ring-ring"
							>
								<X className="size-5 stroke-[2.5]" />
							</SheetPrimitive.Close>
						</div>
						<SheetPrimitive.Title className="sr-only">{title}</SheetPrimitive.Title>
						{children}
					</div>
				</SheetPrimitive.Content>
			</SheetPrimitive.Portal>
		</SheetPrimitive.Root>
	);
}

/** Serif title inside a side panel ("Strawberry Shake", "María López"). */
export function SidePanelHeading({ children }: { children: ReactNode }) {
	return <p className="font-serif text-[28px] leading-[34px] tracking-[-0.01em]">{children}</p>;
}
