import { err, ok, type Result } from 'neverthrow';

import { client } from '@/shared/client';
import type { WebLoginResponse, WebChallengeResponse, WebLoginPost, ApiUserGet } from '@/shared/api/models'
import { type AppError, AppErrors } from '@/shared/models/app-error/app-error';

function ensureLoginResponse(response: WebLoginResponse | WebChallengeResponse): Result<WebLoginResponse, AppError> {
  if ("expires_in" in response) {
    return err(AppErrors.unauthorized("2FA not currently supported"));
  }

  return ok(response);
}

export type User = ApiUserGet;
export type Credentials = WebLoginPost;

/**
 * Auth endpoints. The template assumes a cookie session: `/auth/login` sets an
 * HTTP-only cookie that the browser sends with every later request (see
 * `appFetch`). For bearer tokens, see docs/authentication.md.
 */
export const authApi = {
	login: (credentials: WebLoginPost) =>
		client
			.POST('/auth/web/login/', { body: credentials })
			.andThen(res => ensureLoginResponse(res.data!)),

	logout: () => client.POST('/auth/web/logout/').map(() => undefined),

	/** The current user, or `null` when not signed in (401). */
	me: () =>
		client
			.GET('/auth/profile/')
			.map(res => res.data!)
};
