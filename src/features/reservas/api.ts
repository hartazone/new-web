import { client } from '@/shared/client';
import type { Schema } from '@/shared/client/api-helpers';
import { fetchAllPages } from '@/shared/data/fetch-all-pages';

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
