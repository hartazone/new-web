import { useQueryClient } from '@tanstack/react-query';
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
	useRouterState
} from '@tanstack/react-router';
import { useEffect } from 'react';

import { Brand } from '@/app/components/brand';
import { UserMenu } from '@/app/components/user-menu';
import { navigation } from '@/app/navigation';
import { authKeys, sessionQuery } from '@/features/auth/session';
import { AppShell } from '@/shared/ui/layout/app-shell';
import { ModeToggle } from '@/shared/ui/theme/mode-toggle';
import { eventBus, events } from '@/shared/utils/events';

/**
 * Pathless layout for every authenticated page: checks the session before
 * any child loads, and renders the app shell around them.
 */
export const Route = createFileRoute('/_app')({
	beforeLoad: async ({ context, location }) => {
		const user = await context.queryClient.ensureQueryData(sessionQuery);
		if (!user) {
			throw redirect({ to: '/login', search: { redirect: location.href } });
		}
		return { user };
	},
	component: AppLayout
});

function AppLayout() {
	useRedirectOnSessionExpired();

	return (
		<AppShell
			brand={<Brand />}
			navigation={navigation}
			topbar={
				<>
					<ModeToggle />
				</>
			}
			sidebarFooter={
				<div>
					<UserMenu/>
				</div>
			}
		>
			<Outlet />
		</AppShell>
	);
}

/** Any 401 from the API (see config/query-client.ts) sends the user back to /login. */
function useRedirectOnSessionExpired() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const href = useRouterState({ select: s => s.location.href });

	useEffect(
		() =>
			eventBus.listen(events.sessionExpired, () => {
				queryClient.setQueryData(authKeys.session, null);
				navigate({ to: '/login', search: { redirect: href } });
			}),
		[queryClient, navigate, href]
	);
}
