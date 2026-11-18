import { client } from '@/shared/client';
import type { Schema } from '@/shared/client/api-helpers';
import { fetchAllPages } from '@/shared/data/fetch-all-pages';

/**
 * A business. Paginated lists come back with geometry coordinates widened to
 * `number[]`; the portal does not use the geometry, so it is left out and both
 * shapes fit.
 */
export type Comercio = Omit<Schema<'ComercioGet'>, 'ubicacion' | 'zona'>;
export type UsuarioComercio = Schema<'UsuarioComercioGet'>;
export type ComercioHorario = Schema<'ComercioHorarioGet'>;
export type VentanaRecogida = Schema<'VentanaRecogidaGet'>;
export type PausaComercio = Schema<'PausaComercioGet'>;

/**
 * Endpoints of the `comercios` and `perfiles` modules the portal needs to
 * know who is operating and on behalf of which business.
 */
export const comercioApi = {
	/** Businesses the signed-in user can operate (the API scopes the list to the session). */
	list: () =>
		fetchAllPages((page, page_size) =>
			client
				.GET('/comercios/comercio/', { params: { query: { page, page_size } } })
				.map(res => res.data!)
		),

	detail: (id: string) =>
		client.GET('/comercios/comercio/{id}/', { params: { path: { id } } }).map(res => res.data!),

	/** The membership of `usuarioId` in the business: its role and the id that signs actions. */
	membership: (comercioId: string, usuarioId: string) =>
		client
			.GET('/perfiles/comercio/{comercio_id}/usuario-comercio/', {
				params: {
					path: { comercio_id: comercioId },
					query: { usuario_id: usuarioId, is_active: true, page_size: 1 }
				}
			})
			.map(res => res.data!.results[0] ?? null),

	horarios: (comercioId: string) =>
		fetchAllPages<ComercioHorario>((page, page_size) =>
			client
				.GET('/comercios/comercio/{comercio_id}/comercio-horario/', {
					params: { path: { comercio_id: comercioId }, query: { page, page_size } }
				})
				.map(res => res.data!)
		),

	ventanas: (comercioId: string) =>
		fetchAllPages<VentanaRecogida>((page, page_size) =>
			client
				.GET('/comercios/comercio/{comercio_id}/ventana-recogida/', {
					params: {
						path: { comercio_id: comercioId },
						query: { page, page_size, is_active: true }
					}
				})
				.map(res => res.data!)
		),

	pausas: (comercioId: string) =>
		client
			.GET('/comercios/comercio/{comercio_id}/pausa-comercio/', {
				params: { path: { comercio_id: comercioId }, query: { page_size: 20 } }
			})
			.map(res => res.data!.results),

	pausar: (body: Schema<'PausaComercioPost'>) =>
		client
			.POST('/comercios/comercio/{comercio_id}/pausa-comercio/', {
				params: { path: { comercio_id: body.comercio_id } },
				body
			})
			.map(res => res.data!)
};
