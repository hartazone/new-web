import { House, Package } from 'lucide-react';

import type { ShellNavSection } from '@/shared/ui/layout/app-shell';

/** Sidebar navigation. Add an entry when you add a top-level page. */
export function navigation(): ShellNavSection[] {
	return [
		{
			items: [
				{ label: 'Inicio', icon: House, link: { to: '/dashboard' }, exact: true },
				{ label: 'Mis ofertas', icon: Package, link: { to: '/ofertas' } }
			]
		}
	];
}
