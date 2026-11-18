import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapOrThrow } from '@/shared/models/result/result';

import { authApi, type Credentials } from './api';

/** Root of every auth query key (the global 401 handler ignores it). */
export const authKeys = {
	session: ['auth', 'session'] as const
};

/**
 * The signed-in user, or `null`. Route guards read it with
 * `queryClient.ensureQueryData(sessionQuery)` in `beforeLoad`.
 */
export const sessionQuery = queryOptions({
	queryKey: authKeys.session,
	queryFn: () => unwrapOrThrow(authApi.me()),
	staleTime: 5 * 60_000
});

/** The current user inside the authenticated area (always defined there). */
export function useCurrentUser() {
	const { data } = useQuery(sessionQuery);
	return data ?? null;
}

export function useLogin() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (credentials: Credentials) => unwrapOrThrow(authApi.login(credentials)),
		// The login answers `{ user }` with a reduced user; drop the cached session so
		// the guard loads the full one from /auth/profile/ (same shape as `User`).
		onSuccess: () => queryClient.removeQueries({ queryKey: authKeys.session })
	});
}

export function useLogout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => unwrapOrThrow(authApi.logout()),
		// Drop every cached query: the next user must not see this user's data.
		onSettled: () => {
			queryClient.clear();
			queryClient.setQueryData(authKeys.session, null);
		}
	});
}
