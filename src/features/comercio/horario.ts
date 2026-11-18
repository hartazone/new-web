import { formatClock } from '@/shared/utils/dates';

import type { ComercioHorario, VentanaRecogida } from './api';

/** `dia_semana`: 0 = domingo … 6 = sábado (docs: modelo-dominio/modulos/horarios). */
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Week order of the design: Monday first. */
export const SEMANA = [1, 2, 3, 4, 5, 6, 0];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "6:00 a. m. a 6:00 p. m." */
export const rangoHoras = (inicio: string, fin: string) =>
	`${formatClock(inicio)} a ${formatClock(fin)}`;

/**
 * Sentence for the opening hours: consecutive days with the same hours are
 * joined ("Lunes a sábado, 6:00 a. m. a 6:00 p. m."; "Domingo cerrado").
 */
export function resumenHorario(horarios: ComercioHorario[]): string | null {
	if (!horarios.length) return null;
	const byDay = new Map(horarios.map(h => [h.dia_semana, h]));
	const key = (d: number) => {
		const h = byDay.get(d);
		if (!h || h.cerrado || !h.hora_apertura || !h.hora_cierre) return null;
		return `${h.hora_apertura}|${h.hora_cierre}`;
	};

	const runs: { from: number; to: number; key: string }[] = [];
	for (const day of SEMANA) {
		const k = key(day);
		if (!k) continue;
		const last = runs[runs.length - 1];
		const prevIndex = last ? SEMANA.indexOf(last.to) : -2;
		if (last && last.key === k && SEMANA.indexOf(day) === prevIndex + 1) last.to = day;
		else runs.push({ from: day, to: day, key: k });
	}
	if (!runs.length) return 'Cerrado toda la semana';

	return runs
		.map(({ from, to, key: k }) => {
			const [inicio, fin] = k.split('|');
			const span =
				from === to
					? DIAS[from]
					: SEMANA.indexOf(to) - SEMANA.indexOf(from) === 1
						? `${DIAS[from]} y ${DIAS[to]}`
						: `${DIAS[from]} a ${DIAS[to]}`;
			return `${span}, ${rangoHoras(inicio, fin)}`;
		})
		.map((text, i) => (i === 0 ? capitalize(text) : text))
		.join('; ');
}

/** "Cierre: 5:00 p. m. a 6:00 p. m." for the distinct pickup windows. */
export function resumenVentanas(ventanas: VentanaRecogida[]): string[] {
	const seen = new Map<string, string>();
	for (const v of [...ventanas].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))) {
		const label = `${v.etiqueta ? `${v.etiqueta}: ` : ''}${rangoHoras(v.hora_inicio, v.hora_fin)}`;
		seen.set(label, label);
	}
	return [...seen.values()];
}
