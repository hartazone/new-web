import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useComercio } from '@/features/comercio/session';
import { ofertaKeys } from '@/features/ofertas/queries';
import { unwrapOrThrow } from '@/shared/models/result/result';
import { isoDate } from '@/shared/utils/dates';

import { reservasApi, type ValidarReservaPost } from './api';
import { grupoDe } from './model';

export const reservaKeys = {
	all: ['reservas'] as const,
	dia: (comercioId: string, fecha: string) => ['reservas', comercioId, 'dia', fecha] as const,
	detail: (id: string) => ['reservas', 'detail', id] as const,
	desde: (comercioId: string, desde: string) => ['reservas', comercioId, 'desde', desde] as const
};

/** Reservations from a day until today (history). */
export const reservasDesdeQuery = (comercioId: string, desde: string) =>
	queryOptions({
		queryKey: reservaKeys.desde(comercioId, desde),
		queryFn: () => unwrapOrThrow(reservasApi.desde(comercioId, desde))
	});

/** All the reservations of one day; refreshed while the page is open (CU-C-27). */
export const reservasDelDiaQuery = (comercioId: string, fecha: string) =>
	queryOptions({
		queryKey: reservaKeys.dia(comercioId, fecha),
		queryFn: () => unwrapOrThrow(reservasApi.delDia(comercioId, fecha)),
		refetchInterval: fecha === isoDate() ? 60_000 : false
	});

export const reservaQuery = (id: string) =>
	queryOptions({
		queryKey: reservaKeys.detail(id),
		queryFn: () => unwrapOrThrow(reservasApi.detail(id))
	});

/** Reservations still waiting to be picked up today (sidebar counter). */
export function usePendientesHoy() {
	const { comercio } = useComercio();
	const { data } = useQuery(reservasDelDiaQuery(comercio.id, isoDate()));
	return data?.filter(r => grupoDe(r) === 'por_retirar').length ?? 0;
}

function useInvalidateReservas() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: reservaKeys.all }),
			// Cancelling or delivering moves the units of the offer.
			queryClient.invalidateQueries({ queryKey: ofertaKeys.all })
		]);
}

export function useCancelarReserva() {
	const invalidate = useInvalidateReservas();
	return useMutation({
		mutationFn: ({ reservaId, motivoId }: { reservaId: string; motivoId: string }) =>
			unwrapOrThrow(reservasApi.cancelar(reservaId, motivoId)),
		onSuccess: () => invalidate()
	});
}

export function useValidarReserva() {
	const invalidate = useInvalidateReservas();
	return useMutation({
		mutationFn: (body: ValidarReservaPost) => unwrapOrThrow(reservasApi.validar(body)),
		onSuccess: () => invalidate()
	});
}
