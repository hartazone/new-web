import { Link, type LinkOptions } from '@tanstack/react-router';
import { ArrowLeft, Menu } from 'lucide-react';
import type { ReactNode } from 'react';

export type Crumb = { label: string; link?: LinkOptions };

/**
 * Yellow page header from the design: serif title, subtitle, optional back
 * link and actions on the right (pickup status, business, notices).
 */
export function PageHeader({
	title,
	description,
	back,
	actions,
	onOpenMenu
}: {
	title: ReactNode;
	description?: ReactNode;
	back?: { label: string; link: LinkOptions };
	actions?: ReactNode;
	/** Opens the navigation drawer on small screens. */
	onOpenMenu?: () => void;
}) {
	return (
		<header className="flex w-full flex-wrap items-center gap-4 rounded-bl-[32px] bg-brand px-4 py-5 text-foreground sm:px-6 md:px-10 md:py-7 dark:text-primary-foreground">
			{onOpenMenu && (
				<button
					type="button"
					onClick={onOpenMenu}
					aria-label="Abrir menú"
					className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden dark:border-primary-foreground dark:bg-transparent"
				>
					<Menu className="size-5" />
				</button>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{back && (
					<Link
						{...back.link}
						className="flex w-fit items-center gap-1.5 text-sm font-bold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
					>
						<ArrowLeft className="size-4" aria-hidden />
						{back.label}
					</Link>
				)}
				<h1 className="font-serif text-[28px] leading-[34px] tracking-[-0.01em] md:text-[36px] md:leading-[42px]">
					{title}
				</h1>
				{description && <p className="text-base leading-6 font-medium">{description}</p>}
			</div>
			{actions && <div className="flex flex-wrap items-center gap-3 md:gap-4">{actions}</div>}
		</header>
	);
}
