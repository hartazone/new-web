import { Ban, Check, Clock, Hourglass, TriangleAlert, X, type LucideIcon } from 'lucide-react';

import type { CodigoEstadoReserva } from '@/features/catalogos/queries';
import type { ChipTone } from '@/shared/ui/hz/chip';

import type { Reserva } from './api';

export type GrupoReserva = 'por_retirar' | 'entregada' | 'cancelada' | 'no_retirada' | 'otra';

export function grupoDe(reserva: Reserva): GrupoReserva {
	switch (reserva.estado.codigo as CodigoEstadoReserva) {
		case 'activa':
			return 'por_retirar';
		case 'retirada':
			return 'entregada';
		case 'cancelada_usuario':
		case 'cancelada_comercio':
		case 'cancelada_administracion':
			return 'cancelada';
		case 'expirada':
			return 'no_retirada';
		default:
			return 'otra';
	}
}

/** State chip as the business reads it ("Por retirar", "Retirada y cobrada"…). */
export function estadoReserva(reserva: Reserva): {
	label: string;
	icon: LucideIcon;
	tone: ChipTone;
} {
	switch (reserva.estado.codigo as CodigoEstadoReserva) {
		case 'activa':
			return { label: 'Por retirar', icon: Clock, tone: 'warning' };
		case 'retirada':
			return { label: 'Retirada y cobrada', icon: Check, tone: 'success' };
		case 'cancelada_usuario':
			return { label: 'Canceló el cliente', icon: X, tone: 'error' };
		case 'cancelada_comercio':
			return { label: 'Cancelada por el negocio', icon: X, tone: 'error' };
		case 'cancelada_administracion':
			return { label: 'Cancelada por Hartazone', icon: Ban, tone: 'error' };
		case 'expirada':
			return { label: 'No retirada', icon: TriangleAlert, tone: 'neutral' };
		default:
			return {
				label: reserva.estado.etiqueta || 'Reservando',
				icon: Hourglass,
				tone: 'neutral'
			};
	}
}

/** Pickup codes are six Crockford base-32 characters, shown as "K7M 2QD". */
export function formatCodigo(codigo: string | null | undefined) {
	const clean = normalizeCodigo(codigo ?? '');
	return clean.length > 3 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
}

/**
 * What the operator typed or scanned, as the API stores it: uppercase, no
 * spaces. The alphabet (`^[0-9A-HJ-NP-TV-Z]{6}$`) leaves out I, O and U, so
 * the look-alikes O→0 and I→1 are mapped and anything else is dropped.
 */
export function normalizeCodigo(text: string) {
	return text
		.toUpperCase()
		.replace(/O/g, '0')
		.replace(/I/g, '1')
		.replace(/[^0-9A-HJ-NP-TV-Z]/g, '');
}

export const CODIGO_LENGTH = 6;

/**
 * The customer's name. `ReservaGet` does not expose it yet (CU-C-28 asks
 * for it), so any name field the API adds is used and otherwise a neutral
 * label is shown.
 */
export function clienteNombre(reserva: Reserva): string {
	const extra = reserva as Reserva & {
		cliente_nombre?: string;
		nombre_cliente?: string;
		perfil_nombre?: string;
	};
	return extra.cliente_nombre || extra.nombre_cliente || extra.perfil_nombre || 'Cliente';
}

/** "2 × Pack panadería del día" */
export function reservaLabel(
	reserva: Pick<Reserva, 'cantidad' | 'nombre_oferta'>,
	cantidad?: number
) {
	return `${cantidad ?? reserva.cantidad} × ${reserva.nombre_oferta}`;
}

/** Splits today's reservations by what the business has to do with them. */
export function agrupar(reservas: Reserva[]) {
	const groups: Record<GrupoReserva, Reserva[]> = {
		por_retirar: [],
		entregada: [],
		cancelada: [],
		no_retirada: [],
		otra: []
	};
	for (const r of reservas) groups[grupoDe(r)].push(r);
	groups.por_retirar.sort((a, b) => a.ventana_inicio_at.localeCompare(b.ventana_inicio_at));
	return groups;
}
