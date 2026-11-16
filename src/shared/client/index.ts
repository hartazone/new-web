import type { Middleware } from 'openapi-fetch';

import { apiUrl, env } from '@/config/env';

import { APIClient, makePathClient } from './api-client';
import { PathRoute } from './api-helpers';
import { appFetch } from './fetch';
import { CSRFManager } from './managers/csrf-manager';
import { JWTManager } from './managers/jwt-manager';
import { CSRFMiddleware } from './middleware/csrf-middleware';
import { errorMiddleware } from './middleware/error-middleware';
import { logMiddleware } from './middleware/log-middleware';
import { JWTMiddleware } from './middleware/jwt-middleware';
import { eventBus, events } from '../utils/events';

const verifyRoute = PathRoute('/auth/web/verify/');
const refreshRoute = PathRoute('/auth/web/refresh/');
const csrfRoute = PathRoute('/auth/csrf/');
const csrfHeader = 'x-csrftoken';

/**
 * The application's API client.
 *
 * Middlewares run in registration order on requests and in reverse order on
 * responses, so `errorMiddleware` goes first to see the final response.
 *
 * Need auth? `./middleware` ships ready-made CSRF and JWT-refresh middlewares
 * (see docs/api-client.md for the wiring).
 */
const csrf = new CSRFManager({
	headerName: csrfHeader,
	fetchToken: async () => {
		const res = await appFetch(`${apiUrl(csrfRoute)}`);
		return res.headers.get(csrfHeader)!;
	}
});

const jwt = new JWTManager({
	refreshAccess: async () => (await appFetch(`${apiUrl(refreshRoute)}`, { method: 'POST' })).ok,
	verifyAccess: async () => (await appFetch(`${apiUrl(verifyRoute)}`, { method: 'POST' })).ok
});

const middlewares: Middleware[] = [errorMiddleware, JWTMiddleware(jwt, csrf, {
	send: appFetch,
	onSessionExpired: () => eventBus.dispatch(events.sessionExpired),
}), CSRFMiddleware(csrf)];

if (env.debug) middlewares.push(logMiddleware);

export const client = new APIClient(
	makePathClient({ baseUrl: env.apiUrl, fetch: appFetch }),
	middlewares
);

export default client;
