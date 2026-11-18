import { queryOptions } from '@tanstack/react-query';

import { client } from '@/shared/client';
import type { Schema } from '@/shared/client/api-helpers';
import { fetchAllPages } from '@/shared/data/fetch-all-pages';
import { unwrapOrThrow } from '@/shared/models/result/result';

export type Motivo = Schema<'MotivoGet'>;
export type ContextoMotivo = Schema<'ContextoMotivo'>;
export type CategoriaComida = Schema<'CategoriaComidaPublicaGet'>;
export type EstadoReserva = Schema<'EstadoReservaGet'>;
export type EstadoPublicacion = Schema<'EstadoPublicacionGet'>;

/** Codes of `estado_reserva` (see docs: modelo-dominio/modulos/estados). */
export type CodigoEstadoReserva =
	| 'alta'
	| 'retenida'
	| 'activa'
	| 'retirada'
	| 'cancelada_usuario'
	| 'cancelada_comercio'
	| 'cancelada_administracion'
	| 'expirada';

/** Codes of `estado_publicacion`. */
export type CodigoEstadoPublicacion =
	'programada' | 'publicada' | 'agotada' | 'cerrada' | 'cancelada' | 'despublicada';

/** Catalogs change rarely: keep them for the whole session. */
const CATALOG_STALE_TIME = 60 * 60_000;

export const catalogKeys = {
	all: ['catalogos'] as const,
	motivos: (contexto: ContextoMotivo) => ['catalogos', 'motivos', contexto] as const,
	categorias: ['catalogos', 'categorias'] as const,
	estadosReserva: ['catalogos', 'estados-reserva'] as const,
	estadosPublicacion: ['catalogos', 'estados-publicacion'] as const
};

/** Active reasons of a context, e.g. why a business cancels a reservation. */
export const motivosQuery = (contexto: ContextoMotivo) =>
	queryOptions({
		queryKey: catalogKeys.motivos(contexto),
		staleTime: CATALOG_STALE_TIME,
		queryFn: () =>
			unwrapOrThrow(
				fetchAllPages((page, page_size) =>
					client
						.GET('/catalogos/motivo/', {
							params: { query: { page, page_size, contexto, is_active: true } }
						})
						.map(res => res.data!)
				).map(motivos =>
					motivos.filter(m => m.visible_para === 'comercio' || m.visible_para === 'todos')
				)
			)
	});

export const categoriasQuery = queryOptions({
	queryKey: catalogKeys.categorias,
	staleTime: CATALOG_STALE_TIME,
	queryFn: () =>
		unwrapOrThrow(client.GET('/catalogos/publico/categoria-comida/all/').map(res => res.data!))
});

export const estadosReservaQuery = queryOptions({
	queryKey: catalogKeys.estadosReserva,
	staleTime: CATALOG_STALE_TIME,
	queryFn: () =>
		unwrapOrThrow(
			fetchAllPages((page, page_size) =>
				client
					.GET('/estados/estado-reserva/', { params: { query: { page, page_size } } })
					.map(res => res.data!)
			)
		)
});

export const estadosPublicacionQuery = queryOptions({
	queryKey: catalogKeys.estadosPublicacion,
	staleTime: CATALOG_STALE_TIME,
	queryFn: () =>
		unwrapOrThrow(
			fetchAllPages((page, page_size) =>
				client
					.GET('/estados/estado-publicacion/', { params: { query: { page, page_size } } })
					.map(res => res.data!)
			)
		)
});

/** Looks up the id of a state code (`undefined` while the catalog loads). */
export function estadoId<T extends { id: string; codigo: string }>(
	estados: T[] | undefined,
	codigo: string
): string | undefined {
	return estados?.find(e => e.codigo === codigo)?.id;
}
