import { Clock, House, Package, Ticket } from 'lucide-react';

import { usePendientesHoy } from '@/features/reservas/queries';
import type { ShellNavSection } from '@/shared/ui/layout/app-shell';

/** Sidebar navigation. Add an entry when you add a top-level page. */
export function useNavigation(): ShellNavSection[] {
	const pendientes = usePendientesHoy();
	return [
		{
			items: [
				{ label: 'Inicio', icon: House, link: { to: '/dashboard' }, exact: true },
				{ label: 'Mis ofertas', icon: Package, link: { to: '/ofertas' } },
				{ label: 'Reservas', icon: Ticket, link: { to: '/reservas' }, badge: pendientes },
				{ label: 'Historial', icon: Clock, link: { to: '/historial' } }
			]
		}
	];
}
