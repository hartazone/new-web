import type { components, paths } from './api-types';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** JSON body the typed client expects for `METHOD path`. */
export type RequestBody<P extends keyof paths, M extends Method> = paths[P][M] extends {
	requestBody?: { content: { 'application/json': infer B } };
}
	? B
	: never;

/** JSON body of the 2xx response for `METHOD path`. */
export type ResponseBody<P extends keyof paths, M extends Method> = paths[P][M] extends {
	responses: infer R;
}
	? {
			[S in keyof R]: S extends 200 | 201 | 202
				? R[S] extends { content: { 'application/json': infer B } }
					? B
					: never
				: never;
		}[keyof R]
	: never;

/** Shorthand for a component schema: `Schema<'Item'>`. */
export type Schema<N extends keyof components['schemas']> = components['schemas'][N];

export const PathRoute = <N extends keyof paths>(route: N) => route;
