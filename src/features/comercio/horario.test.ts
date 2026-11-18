import { describe, expect, test } from 'vitest';

import type { ComercioHorario } from './api';
import { resumenHorario } from './horario';

const dia = (
	dia_semana: number,
	apertura: string | null,
	cierre: string | null
): ComercioHorario => ({
	id: String(dia_semana),
	comercio_id: 'c',
	dia_semana,
	cerrado: apertura == null,
	hora_apertura: apertura,
	hora_cierre: cierre,
	franja_atencion: null
});

const norm = (text: string | null) => text?.replace(/\s/g, ' ');

describe('resumenHorario', () => {
	test('joins consecutive days with the same hours', () => {
		const semana = [0, 1, 2, 3, 4, 5, 6].map(d =>
			d === 0 ? dia(0, null, null) : dia(d, '06:00:00', '18:00:00')
		);
		expect(norm(resumenHorario(semana))).toBe('Lunes a sábado, 6:00 a. m. a 6:00 p. m.');
	});

	test('lists different hours separately', () => {
		const semana = [
			dia(1, '08:00:00', '17:00:00'),
			dia(2, '08:00:00', '17:00:00'),
			dia(6, '09:00:00', '13:00:00')
		];
		expect(norm(resumenHorario(semana))).toBe(
			'Lunes y martes, 8:00 a. m. a 5:00 p. m.; sábado, 9:00 a. m. a 1:00 p. m.'
		);
	});

	test('says when it is closed all week', () => {
		expect(resumenHorario([dia(1, null, null)])).toBe('Cerrado toda la semana');
		expect(resumenHorario([])).toBeNull();
	});
});
