import type { Middleware } from 'openapi-fetch';
import { describe, expect, test, vi } from 'vitest';

import { APIClient, type PathClient } from '@/shared/client/api-client';
import { errorMiddleware } from '@/shared/client/middleware/error-middleware';
import { logMiddleware } from '@/shared/client/middleware/log-middleware';

function makeClient() {
	const use = vi.fn();
	const request = vi.fn();

	const pathClient = {
		use,
		request
	} as unknown as PathClient;

	return {
		pathClient,
		use,
		request
	};
}

describe('APIClient', () => {
	test('registers middlewares', () => {
		const { pathClient, use } = makeClient();

		const firstMiddleware: Middleware = errorMiddleware;
		const secondMiddleware: Middleware = logMiddleware;

		new APIClient(pathClient, [firstMiddleware, secondMiddleware]);

		expect(use).toHaveBeenCalledTimes(2);

		expect(use).toHaveBeenNthCalledWith(1, firstMiddleware);

		expect(use).toHaveBeenNthCalledWith(2, secondMiddleware);
	});

	test('GET delegates request to path client', async () => {
		const { pathClient, request } = makeClient();

		const expected = {
			data: {
				results: []
			}
		};

		request.mockResolvedValue(expected);

		const client = new APIClient(pathClient);

		const result = await client.GET('/auth/profile/');

		expect(request).toHaveBeenCalledOnce();

		expect(request).toHaveBeenCalledWith('get', '/auth/profile/');

		expect(result._unsafeUnwrap()).toBe(expected);
	});

	test('POST delegates body to path client', async () => {
		const { pathClient, request } = makeClient();

		const expected = {
			data: {
				id: '550e8400-e29b-41d4-a716-446655440000',
				cantidad: 1
			}
		};

		request.mockResolvedValue(expected);

		const client = new APIClient(pathClient);

		const result = await client.POST('/reservas/cancelar-reserva/', {
			body: {
				reserva_id: '550e8400-e29b-41d4-a716-446655440000',
				motivo_id: '9b2f6c1e-4d7a-4f3e-8a51-2c0d7e9f1a33'
			}
		});

		expect(request).toHaveBeenCalledWith('post', '/reservas/cancelar-reserva/', {
			body: {
				reserva_id: '550e8400-e29b-41d4-a716-446655440000',
				motivo_id: '9b2f6c1e-4d7a-4f3e-8a51-2c0d7e9f1a33'
			}
		});

		expect(result._unsafeUnwrap()).toBe(expected);
	});

	test('PATCH delegates path params and body', async () => {
		const { pathClient, request } = makeClient();

		const expected = {
			data: {
				id: '550e8400-e29b-41d4-a716-446655440000',
				etiqueta: 'Se vendió en el local'
			}
		};

		request.mockResolvedValue(expected);

		const client = new APIClient(pathClient);

		const result = await client.PATCH('/catalogos/motivo/{id}/', {
			params: {
				path: {
					id: '550e8400-e29b-41d4-a716-446655440000'
				}
			},
			body: {
				etiqueta: 'Se vendió en el local'
			}
		});

		expect(request).toHaveBeenCalledWith('patch', '/catalogos/motivo/{id}/', {
			params: {
				path: {
					id: '550e8400-e29b-41d4-a716-446655440000'
				}
			},
			body: {
				etiqueta: 'Se vendió en el local'
			}
		});

		expect(result._unsafeUnwrap()).toBe(expected);
	});

	test('DELETE delegates path params', async () => {
		const { pathClient, request } = makeClient();

		const expected = {
			data: undefined
		};

		request.mockResolvedValue(expected);

		const client = new APIClient(pathClient);

		const result = await client.DELETE('/catalogos/motivo/{id}/', {
			params: {
				path: {
					id: '550e8400-e29b-41d4-a716-446655440000'
				}
			}
		});

		expect(request).toHaveBeenCalledWith('delete', '/catalogos/motivo/{id}/', {
			params: {
				path: {
					id: '550e8400-e29b-41d4-a716-446655440000'
				}
			}
		});

		expect(result._unsafeUnwrap()).toBe(expected);
	});
});
