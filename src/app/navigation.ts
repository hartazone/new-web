import type { LinkOptions } from '@tanstack/react-router';
import { Home, Settings, type LucideIcon } from 'lucide-react';

export type NavItem = {
	label: string;
	icon: LucideIcon;
	link: LinkOptions;
	/** Active only on the exact path (otherwise also on child paths). */
	exact?: boolean;
};

export type NavSection = { label?: string; items: NavItem[] };

/** Sidebar navigation. Add an entry when you add a top-level page. */
export const navigation: NavSection[] = [
	{
		items: [
			{ label: 'Inicio', icon: Home, link: { to: '/dashboard' }, exact: true }
		]
	},
	{
		label: 'Account',
		items: [{ label: 'Settings', icon: Settings, link: { to: '/settings' } }]
	}
];
