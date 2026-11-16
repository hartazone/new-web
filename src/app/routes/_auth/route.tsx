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
			<div className="w-full h-full flex justify-center items-center gap-5 bg-linear-150 from-[#E6651A] to-[#FFCD59] rounded-br-2xl">
				<img src="/favicon.svg" alt="" className="size-6" />
				<h1>Que ninguna comida buena se quede sin dueño.</h1>
			</div>
			<main className="flex flex-1 items-center justify-center px-4 pb-16">
				<div className="w-full max-w-sm">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
