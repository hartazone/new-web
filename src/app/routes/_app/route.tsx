import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
	useRouterState
} from '@tanstack/react-router';
import { ScanQrCode } from 'lucide-react';
import { useEffect } from 'react';

import { Brand } from '@/app/components/brand';
import { HeaderActions } from '@/app/components/header-actions';
import { UserMenu } from '@/app/components/user-menu';
import { useNavigation } from '@/app/navigation';
import { authKeys, sessionQuery, useLogout } from '@/features/auth/session';
import { ComercioProvider, comerciosQuery } from '@/features/comercio/session';
import { AppError } from '@/shared/models/app-error/app-error';
import { AppShell } from '@/shared/ui/layout/app-shell';
import { PageContextProvider } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import { eventBus, events } from '@/shared/utils/events';

export { usePageInformation } from '@/shared/ui/layout/page-context';

/**
 * Pathless layout for every authenticated page: checks the session and loads
 * the businesses the user operates before any child loads, and renders the
 * app shell around them.
 */
export const Route = createFileRoute('/_app')({
	beforeLoad: async ({ context, location }) => {
		const result = await AppError.toResult(context.queryClient.query(sessionQuery));
		if (result.isErr() || !result.value) {
			throw redirect({ to: '/login', search: { redirect: location.href } });
		}
		return { user: result.value };
	},
	loader: ({ context }) => context.queryClient.ensureQueryData(comerciosQuery),
	component: AppLayout
});

function AppLayout() {
	useRedirectOnSessionExpired();
	const { data: comercios } = useSuspenseQuery(comerciosQuery);

	if (!comercios.length) return <NoComercio />;

	return (
		<ComercioProvider comercios={comercios}>
			<PageContextProvider>
				<Shell />
			</PageContextProvider>
		</ComercioProvider>
	);
}

/** The shell needs the business in context (the counters are per business). */
function Shell() {
	return (
		<AppShell
			brand={<Brand />}
			primaryAction={close => (
				<Button variant="brand" size="xl" className="w-full" asChild>
					<Link to="/validar" onClick={close}>
						<ScanQrCode /> Validar entrega
					</Link>
				</Button>
			)}
			navigation={useNavigation()}
			headerActions={<HeaderActions />}
			sidebarFooter={<UserMenu />}
		>
			<Outlet />
		</AppShell>
	);
}

/** The account is valid but is not an active member of any business. */
function NoComercio() {
	const logout = useLogout();
	const navigate = useNavigate();
	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-4">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<img src="/harturito.svg" alt="" width={97} height={88} />
				<h1 className="font-serif text-3xl">Tu cuenta no tiene un negocio activo</h1>
				<p className="text-muted-foreground">
					Si te invitaron a un negocio, abrí el enlace del correo de invitación. Si
					afiliaste tu negocio, esperá a que Hartazone apruebe la solicitud.
				</p>
				<Button
					variant="outline"
					onClick={() =>
						logout.mutate(undefined, { onSettled: () => navigate({ to: '/login' }) })
					}
				>
					Cerrar sesión
				</Button>
			</div>
		</main>
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
