import { createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { LoginForm } from '@/features/auth/login-form';

export const Route = createFileRoute('/_auth/login')({
	// Typed, validated search params: /login?redirect=/items
	validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
	component: LoginPage
});

function LoginPage() {
	const { redirect } = Route.useSearch();
	const router = useRouter();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-4xl font-semibold tracking-tight font-serif">Entrá a tu portal</h1>
				<p className="text-sm text-muted-foreground">
					Publicá tu comida del día, mirá tus reservas y confirmá las entregas.
				</p>
			</div>
			<LoginForm
				onSuccess={() => {
					// Only follow same-origin paths to avoid open redirects.
					const target =
						redirect?.startsWith('/') && !redirect.startsWith('//')
							? redirect
							: '/dashboard';
					router.history.push(target);
				}}
			/>
		</div>
	);
}
