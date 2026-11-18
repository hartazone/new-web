import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { Compass } from 'lucide-react';
import { lazy, Suspense } from 'react';

import { env } from '@/config/env';
import { EmptyState } from '@/shared/ui/feedback/empty-state';
import { ErrorState } from '@/shared/ui/feedback/error-state';
import { Toaster } from '@/shared/ui/hz/toast';
import { Button } from '@/shared/ui/primitives/button';
import { ThemeProvider } from '@/shared/ui/theme/theme-provider';

/** Available to every route's `beforeLoad` and `loader` as `context`. */
export interface RouterContext {
	queryClient: QueryClient;
}

// Devtools are dev-only and lazy, so they never reach the production bundle.
const Devtools = env.isDev
	? lazy(() => import('@/app/components/devtools').then(m => ({ default: m.Devtools })))
	: () => null;

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
	notFoundComponent: NotFound,
	errorComponent: ({ error, reset }) => (
		<div className="mx-auto max-w-lg py-20">
			<ErrorState error={error} onRetry={reset} />
		</div>
	)
});

function RootLayout() {
	return (
		<ThemeProvider defaultTheme="light">
			<Outlet />
			<Toaster />
			<Suspense>
				<Devtools />
			</Suspense>
		</ThemeProvider>
	);
}

function NotFound() {
	return (
		<div className="mx-auto max-w-lg py-20">
			<EmptyState
				icon={Compass}
				title="No encontramos esta página"
				description="La página que buscás no existe o cambió de lugar."
				actions={
					<Button asChild>
						<Link to="/">Ir al inicio</Link>
					</Button>
				}
			/>
		</div>
	);
}
