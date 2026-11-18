import { okAsync, type ResultAsync } from 'neverthrow';

import { client } from '@/shared/client';
import type { Schema } from '@/shared/client/api-helpers';
import { fetchAllPages } from '@/shared/data/fetch-all-pages';
import type { AppError } from '@/shared/models/app-error/app-error';

export type Publicacion = Schema<'PublicacionGet'>;
export type PublicacionPost = Schema<'PublicacionPost'>;
export type PublicacionPatch = Schema<'PublicacionPatch'>;
export type TipoOferta = 'pack_sorpresa' | 'oferta_especifica';

export type PublicacionFilters = {
	/** Exact operating day (`YYYY-MM-DD`). */
	fecha_operativa?: string;
	/** Only publications whose bookings closed before this instant (past days). */
	reservas_cierran_at_before?: string;
	order?: Schema<'PublicacionOrder'>;
};

/**
 * Publications (the offer of one day) and everything needed to create one:
 * the template that holds the items of a surprise pack, the product photo
 * and the fitness declaration that opens it to reservations.
 */
export const ofertasApi = {
	list: (comercioId: string, filters: PublicacionFilters = {}) =>
		fetchAllPages((page, page_size) =>
			client
				.GET('/ofertas/comercio/{comercio_id}/publicacion/', {
					params: {
						path: { comercio_id: comercioId },
						query: { page, page_size, ...filters }
					}
				})
				.map(res => res.data!)
		),

	detail: (comercioId: string, id: string) =>
		client
			.GET('/ofertas/comercio/{comercio_id}/publicacion/{id}/', {
				params: { path: { comercio_id: comercioId, id } }
			})
			.map(res => res.data!),

	update: (comercioId: string, id: string, body: PublicacionPatch) =>
		client
			.PATCH('/ofertas/comercio/{comercio_id}/publicacion/{id}/', {
				params: { path: { comercio_id: comercioId, id } },
				body
			})
			.map(res => res.data!),

	create: (body: PublicacionPost) =>
		client
			.POST('/ofertas/comercio/{comercio_id}/publicacion/', {
				params: { path: { comercio_id: body.comercio_id } },
				body
			})
			.map(res => res.data!),

	/** RF-C-35: without this declaration a publication never opens to reservations. */
	declararAptitud: (publicacionId: string, usuarioComercioId: string) =>
		client
			.POST('/ofertas/declarar-aptitud/', {
				body: { publicacion_id: publicacionId, usuario_comercio_id: usuarioComercioId }
			})
			.map(res => res.data!),

	/**
	 * A surprise pack lists what it may contain in its template (3 to 8
	 * items); the publication itself keeps an empty description. Active
	 * templates have unique names per business, so a template with the same
	 * name is reused and only the missing items are added.
	 */
	ensurePackTemplate: (body: Schema<'PlantillaOfertaPost'>, items: string[]) =>
		client
			.GET('/ofertas/comercio/{comercio_id}/plantilla-oferta/', {
				params: {
					path: { comercio_id: body.comercio_id },
					query: {
						tipo: 'pack_sorpresa',
						is_active: true,
						search: body.nombre,
						page_size: 50
					}
				}
			})
			.andThen(res => {
				const existing = res.data!.results.find(
					p => p.nombre.trim().toLowerCase() === body.nombre.trim().toLowerCase()
				);
				if (existing) return okAsync(existing);
				return client
					.POST('/ofertas/comercio/{comercio_id}/plantilla-oferta/', {
						params: { path: { comercio_id: body.comercio_id } },
						body
					})
					.map(created => created.data!);
			})
			.andThen(plantilla =>
				client
					.GET('/ofertas/plantilla-oferta/{plantilla_oferta_id}/plantilla-oferta-item/', {
						params: {
							path: { plantilla_oferta_id: plantilla.id },
							query: { page_size: 50 }
						}
					})
					.andThen(res => {
						const current = new Set(
							res.data!.results.map(i => i.texto.trim().toLowerCase())
						);
						let chain: ResultAsync<unknown, AppError> = okAsync(undefined);
						for (const texto of items.filter(
							t => !current.has(t.trim().toLowerCase())
						)) {
							chain = chain.andThen(() =>
								client.POST(
									'/ofertas/plantilla-oferta/{plantilla_oferta_id}/plantilla-oferta-item/',
									{
										params: { path: { plantilla_oferta_id: plantilla.id } },
										body: { plantilla_oferta_id: plantilla.id, texto }
									}
								)
							);
						}
						return chain.map(() => plantilla);
					})
			),

	/** Uploads the product photo (multipart) and returns the stored media. */
	uploadPhoto: (file: File) => {
		const form = new FormData();
		form.append('file', file);
		form.append('tipo', 'foto_oferta');
		return client
			.POST('/catalogos/media/', {
				body: { file: file.name, tipo: 'foto_oferta' },
				bodySerializer: () => form
			})
			.map(res => res.data!);
	}
};
