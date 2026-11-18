import { Link, type LinkOptions } from '@tanstack/react-router';
import { type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/primitives/sheet';
import { cn } from '@/shared/utils';

import { usePageContext } from './page-context';
import { PageHeader } from './page-header';

export type ShellNavItem = {
	label: string;
	icon: LucideIcon;
	link: LinkOptions;
	exact?: boolean;
	/** Counter shown at the end of the item (pending reservations…). */
	badge?: number;
};

export type ShellNavSection = { label?: string; items: ShellNavItem[] };

/**
 * Application layout from the design: a white sidebar (a drawer on small
 * screens) with the logo, the main action, the navigation and the user card,
 * and a content column topped by the yellow page header.
 */
export function AppShell({
	brand,
	primaryAction,
	navigation,
	headerActions,
	sidebarFooter,
	children
}: {
	brand: ReactNode;
	/** Prominent button above the navigation ("Validar entrega"). */
	primaryAction?: (close: () => void) => ReactNode;
	navigation: ShellNavSection[];
	/** Right side of the page header (business, notices…). */
	headerActions?: ReactNode;
	/** Bottom of the sidebar (user card). */
	sidebarFooter?: ReactNode;
	children: ReactNode;
}) {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const page = usePageContext();
	const close = () => setDrawerOpen(false);

	const sidebar = (
		<div className="flex h-full flex-col gap-6 bg-sidebar px-4 py-6 text-sidebar-foreground">
			<div className="flex shrink-0 px-2">{brand}</div>
			{primaryAction?.(close)}
			<nav aria-label="Principal" className="flex-1 overflow-y-auto">
				{navigation.map((section, i) => (
					<div key={section.label ?? i}>
						{section.label && (
							<p className="px-3.5 pb-1 text-[13px] font-medium tracking-[0.01em] text-muted-foreground">
								{section.label}
							</p>
						)}
						<ul className="flex flex-col gap-1">
							{section.items.map(item => (
								<li key={item.label}>
									<Link
										{...item.link}
										activeOptions={{ exact: item.exact, includeSearch: false }}
										onClick={close}
										className={cn(
											'group flex h-12 items-center gap-3 rounded-xl border-[1.5px] border-transparent px-3.5 text-base leading-6 font-medium transition-colors outline-none',
											'hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
											'data-[status=active]:border-border-strong data-[status=active]:border-2 data-[status=active]:border-b-4 data-[status=active]:bg-primary data-[status=active]:font-bold data-[status=active]:text-primary-foreground'
										)}
									>
										<item.icon
											aria-hidden
											className="size-[22px] shrink-0 stroke-[1.75] group-data-[status=active]:stroke-[2.25]"
										/>
										<span className="flex-1 truncate">{item.label}</span>
										{!!item.badge && (
											<span
												className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-accent px-2 text-[13px] leading-[18px] font-medium tracking-[0.01em] text-primary-foreground"
												aria-label={`${item.badge} pendientes`}
											>
												{item.badge}
											</span>
										)}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</nav>
			{sidebarFooter}
		</div>
	);

	return (
		<div className="flex min-h-dvh">
			<aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 border-r-[1.5px] border-sidebar-border md:block">
				{sidebar}
			</aside>

			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="left" className="w-[280px] sm:max-w-[280px]">
					<SheetTitle className="sr-only">Navegación</SheetTitle>
					{sidebar}
				</SheetContent>
			</Sheet>

			<div className="flex min-w-0 flex-1 flex-col">
				<PageHeader
					title={page?.title ?? ''}
					description={page?.description}
					back={page?.back}
					actions={headerActions}
					onOpenMenu={() => setDrawerOpen(true)}
				/>
				<main className="flex-1 px-4 pt-6 pb-12 sm:px-6 md:px-10 md:pt-8">
					<div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
