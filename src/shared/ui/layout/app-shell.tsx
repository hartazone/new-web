import { Link, type LinkOptions } from '@tanstack/react-router';
import { Menu, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/shared/ui/primitives/button';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/primitives/sheet';
import { cn } from '@/shared/utils';

export type ShellNavSection = {
	label?: string;
	items: { label: string; icon: LucideIcon; link: LinkOptions; exact?: boolean }[];
};

/**
 * Application layout: a sidebar (a drawer on small screens), a top bar and
 * the page content. Purely presentational: pass the brand, navigation and the
 * top-bar slots in.
 */
export function AppShell({
	brand,
	navigation,
	topbar,
	sidebarFooter,
	children
}: {
	brand: ReactNode;
	navigation: ShellNavSection[];
	/** Right side of the top bar (theme toggle, user menu…). */
	topbar?: ReactNode;
	/** Bottom of the sidebar. */
	sidebarFooter?: ReactNode;
	children: ReactNode;
}) {
	const [drawerOpen, setDrawerOpen] = useState(false);

	const sidebar = (
		<div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
			<div className="flex shrink-0 items-center px-5">{brand}</div>
			<nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
				{navigation.map((section, i) => (
					<div key={section.label ?? i} className="mb-4">
						{section.label && (
							<p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
								{section.label}
							</p>
						)}
						<ul className="flex flex-col gap-0.5">
							{section.items.map(item => (
								<li key={item.label}>
									<Link
										{...item.link}
										activeOptions={{ exact: item.exact, includeSearch: false }}
										onClick={() => setDrawerOpen(false)}
										className={cn(
											'flex items-center gap-2.5 rounded-md px-4 py-2 my-2 text-sm transition-colors text-md',
											'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
											'data-[status=active]:bg-primary data-[status=active]:border-b-2 data-[status=active]:border-primary-foreground data-[status=active]:outline-primary-foreground data-[status=active]:outline-2 data-[status=active]:font-bold data-[status=active]:text-sidebar-accent-foreground'
										)}
									>
										<item.icon aria-hidden className="size-4 shrink-0" />
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</div>
				))}
			</nav>
			{sidebarFooter && (
				<div className="border-t border-sidebar-border p-3">{sidebarFooter}</div>
			)}
		</div>
	);

	return (
		<div className="flex min-h-dvh">
			<aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-sidebar-border md:block">
				{sidebar}
			</aside>

			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="left" className="w-64 sm:max-w-64">
					<SheetTitle className="sr-only">Navigation</SheetTitle>
					{sidebar}
				</SheetContent>
			</Sheet>

			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						aria-label="Open navigation"
						onClick={() => setDrawerOpen(true)}
					>
						<Menu />
					</Button>
					<div className="md:hidden">{brand}</div>
					<div className="ml-auto flex items-center gap-1">{topbar}</div>
				</header>
				<main className="flex-1 px-4 py-6 md:px-8 md:py-8">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
