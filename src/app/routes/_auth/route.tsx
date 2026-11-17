import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { sessionQuery } from '@/features/auth/session';

/**
 * Pathless layout for public auth pages (login, sign-up, password reset…).
 * Signed-in users are sent to the app instead.
 */
export const Route = createFileRoute('/_auth')({
	beforeLoad: async ({ context }) => {
		const user = await context.queryClient.ensureQueryData(sessionQuery).catch(() => null);
		if (user) throw redirect({ to: '/dashboard' });
	},
	component: AuthLayout
});

function AuthLayout() {
	return (
		<div className="grid min-h-dvh grid-cols-2">
			<div className="w-full h-full flex flex-col justify-center items-center bg-linear-150 from-[#E6651A] to-[#FFCD59] rounded-br-2xl">
				<img src="/full-logo.svg" alt="logo-hartazone" className="size-128" />
				<p className="font-serif text-4xl text-center -mt-12">Que ninguna comida buena<br/>se quede sin dueño.</p>
			</div>
			<main className="flex flex-1 items-center justify-center px-4 pb-16 bg-card">
				<div className="w-full max-w-sm">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
