import { createFileRoute } from '@tanstack/react-router';

import { useCurrentUser } from '@/features/auth/session';

import { usePageInformation } from './route';

export const Route = createFileRoute('/_app/dashboard')({
	component: DashboardPage
});

function DashboardPage() {
	const user = useCurrentUser();

	usePageInformation({
		title: `Bienvenido, ${user?.first_name ?? ''}`,
		description: ''
	});

	return null;
}
