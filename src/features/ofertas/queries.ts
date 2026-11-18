import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapOrThrow } from '@/shared/models/result/result';

import {
	ofertasApi,
	type Publicacion,
	type PublicacionFilters,
	type PublicacionPatch
} from './api';

export const ofertaKeys = {
	all: ['ofertas'] as const,
	list: (comercioId: string, filters: PublicacionFilters) =>
		['ofertas', comercioId, 'list', filters] as const,
	detail: (comercioId: string, id: string) => ['ofertas', comercioId, 'detail', id] as const
};

export const publicacionesQuery = (comercioId: string, filters: PublicacionFilters) =>
	queryOptions({
		queryKey: ofertaKeys.list(comercioId, filters),
		queryFn: () => unwrapOrThrow(ofertasApi.list(comercioId, filters)),
		// Units change as people reserve: keep the dashboard fresh (CU-C-27).
		refetchInterval: 60_000
	});

export const publicacionQuery = (comercioId: string, id: string) =>
	queryOptions({
		queryKey: ofertaKeys.detail(comercioId, id),
		queryFn: () => unwrapOrThrow(ofertasApi.detail(comercioId, id))
	});

/** PATCH a publication and refresh every list that shows it. */
export function useUpdatePublicacion(comercioId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: PublicacionPatch }) =>
			unwrapOrThrow(ofertasApi.update(comercioId, id, body)),
		onSuccess: (updated: Publicacion) => {
			queryClient.setQueryData(ofertaKeys.detail(comercioId, updated.id), updated);
			return queryClient.invalidateQueries({ queryKey: ofertaKeys.all });
		}
	});
}

/** RF-C-35: confirms the food is fit for consumption, which opens the offer to reservations. */
export function useDeclararAptitud(comercioId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, usuarioComercioId }: { id: string; usuarioComercioId: string }) =>
			unwrapOrThrow(ofertasApi.declararAptitud(id, usuarioComercioId)),
		onSuccess: (updated: Publicacion) => {
			queryClient.setQueryData(ofertaKeys.detail(comercioId, updated.id), updated);
			return queryClient.invalidateQueries({ queryKey: ofertaKeys.all });
		}
	});
}
