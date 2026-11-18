import { Ban, CalendarClock, Check, Gift, Utensils, X, type LucideIcon } from 'lucide-react';

import type { ChipTone } from '@/shared/ui/hz/chip';
import { formatRange, formatRelativeDay } from '@/shared/utils/dates';

import type { Publicacion, TipoOferta } from './api';

export const tipoOferta: Record<TipoOferta, { label: string; icon: LucideIcon; tone: ChipTone }> = {
	pack_sorpresa: { label: 'Pack sorpresa', icon: Gift, tone: 'brand' },
	oferta_especifica: { label: 'Oferta específica', icon: Utensils, tone: 'info' }
};

export function tipoDe(publicacion: Pick<Publicacion, 'tipo'>) {
	return tipoOferta[publicacion.tipo as TipoOferta] ?? tipoOferta.pack_sorpresa;
}

/** Chip of the publication state as the business reads it. */
export function estadoOferta(publicacion: Publicacion): {
	label: string;
	icon: LucideIcon;
	tone: ChipTone;
} {
	switch (publicacion.estado.codigo) {
		case 'publicada':
			return { label: 'Publicada', icon: Check, tone: 'success' };
		case 'agotada':
			return { label: 'Agotada', icon: Ban, tone: 'neutral' };
		case 'programada':
			return { label: 'Programada', icon: CalendarClock, tone: 'warning' };
		case 'cerrada':
			return { label: 'Cerrada', icon: Check, tone: 'neutral' };
		default:
			return { label: publicacion.estado.etiqueta || 'Despublicada', icon: X, tone: 'error' };
	}
}

/** Whether the units of a publication can still change (not closed in any way). */
export function admiteAjuste(publicacion: Publicacion) {
	return !publicacion.estado.terminal && !publicacion.cerrada_at;
}

/** "Retiro hoy, 5:00 p. m. a 6:00 p. m." */
export function retiroLabel(
	publicacion: Pick<Publicacion, 'ventana_inicio_at' | 'ventana_fin_at'>
) {
	return `Retiro ${formatRelativeDay(publicacion.ventana_inicio_at).toLowerCase()}, ${formatRange(
		publicacion.ventana_inicio_at,
		publicacion.ventana_fin_at
	)}`;
}

/** "5 disponibles, 1 reservada" */
export function unidadesLabel(disponibles: number, reservadas: number) {
	const d = `${disponibles} ${disponibles === 1 ? 'disponible' : 'disponibles'}`;
	const r = `${reservadas} ${reservadas === 1 ? 'reservada' : 'reservadas'}`;
	return `${d}, ${r}`;
}

/** Minutes between the end of bookings and the end of the pickup window. */
export function minutosCierreAntes(publicacion: Publicacion) {
	return Math.round(
		(new Date(publicacion.ventana_fin_at).getTime() -
			new Date(publicacion.reservas_cierran_at).getTime()) /
			60_000
	);
}
