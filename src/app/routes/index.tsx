import { sessionQuery } from '@/features/auth/session';
import { AppError } from '@/shared/models/app-error/app-error';
import { createFileRoute, redirect } from '@tanstack/react-router';

/** `/` sends signed-in users to the dashboard (and the guard sends everyone else to /login). */
export const Route = createFileRoute('/')({
	beforeLoad: async ({ context }) => {
		const { queryClient: client } = context;
		const result = await AppError.toResult(client.query(sessionQuery));

		if (result.isErr()) {
			throw redirect({ to: '/login' });
		}

		throw redirect({ to: '/dashboard' });
	}
});
