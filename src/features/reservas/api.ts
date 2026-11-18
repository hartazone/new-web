import { okAsync, type ResultAsync } from 'neverthrow';

import { client } from '@/shared/client';
import type { Schema } from '@/shared/client/api-helpers';
import { fetchAllPages } from '@/shared/data/fetch-all-pages';
import type { AppError } from '@/shared/models/app-error/app-error';

export type Reserva = Schema<'ReservaGet'>;
export type ValidarReservaPost = Schema<'ValidarReservaPost'>;
export type ValidacionEntregada = Schema<'ValidacionEntregadaGet'>;

export const reservasApi = {
	/** Every reservation of the business for one operating day. */
	delDia: (comercioId: string, fecha: string) =>
		fetchAllPages((page, page_size) =>
			client
				.GET('/reservas/reserva/', {
					params: {
						query: { page, page_size, comercio_id: comercioId, fecha_operativa: fecha }
					}
				})
				.map(res => res.data!)
		),

	/**
	 * Reservations from `desde` (`YYYY-MM-DD`) until today, newest first.
	 * The list has no date range filter, so pages are read in descending
	 * order until one reaches an older day.
	 */
	desde: (comercioId: string, desde: string) => {
		const step = (page: number, acc: Reserva[]): ResultAsync<Reserva[], AppError> =>
			client
				.GET('/reservas/reserva/', {
					params: {
						query: {
							page,
							page_size: 100,
							comercio_id: comercioId,
							order: '-fecha_operativa'
						}
					}
				})
				.andThen(res => {
					const data = res.data!;
					const inRange = data.results.filter(r => r.fecha_operativa >= desde);
					const all = acc.concat(inRange);
					const reachedOlder = inRange.length < data.results.length;
					return data.next && !reachedOlder && page < 50
						? step(page + 1, all)
						: okAsync(all);
				});
		return step(1, []);
	},

	/** The reservation behind a pickup code, or `null` when no reservation of this business has it. */
	porCodigo: (comercioId: string, codigo: string) =>
		client
			.GET('/reservas/reserva/', {
				params: { query: { comercio_id: comercioId, codigo, page_size: 1 } }
			})
			.map(res => res.data!.results[0] ?? null),

	detail: (id: string) =>
		client.GET('/reservas/reserva/{id}/', { params: { path: { id } } }).map(res => res.data!),

	/** CU-C-29: cancels, returns the units to the offer and notifies the customer. */
	cancelar: (reservaId: string, motivoId: string) =>
		client
			.POST('/reservas/cancelar-reserva/', {
				body: { reserva_id: reservaId, motivo_id: motivoId }
			})
			.map(res => res.data!),

	/** CU-C-31/32: registers the delivery and the cash collected. */
	validar: (body: ValidarReservaPost) =>
		client.POST('/reservas/validar-reserva/', { body }).map(res => res.data!)
};
