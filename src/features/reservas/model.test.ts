import { describe, expect, test } from 'vitest';

import { codigoFromQr } from '@/features/validar/qr-scanner';

import { formatCodigo, normalizeCodigo } from './model';

describe('normalizeCodigo', () => {
	test('ignores case, spaces and dashes', () => {
		expect(normalizeCodigo(' k7m 2qd ')).toBe('K7M2QD');
		expect(normalizeCodigo('k7m-2qd')).toBe('K7M2QD');
	});

	test('maps the look-alikes that are not in the alphabet', () => {
		expect(normalizeCodigo('8RC5VO')).toBe('8RC5V0');
		expect(normalizeCodigo('W9B4EI')).toBe('W9B4E1');
	});

	test('keeps L, which is part of the alphabet', () => {
		expect(normalizeCodigo('LLL111')).toBe('LLL111');
	});

	test('drops characters outside the alphabet', () => {
		expect(normalizeCodigo('U#K7M2QD')).toBe('K7M2QD');
	});
});

describe('formatCodigo', () => {
	test('splits the code in two groups of three', () => {
		expect(formatCodigo('K7M2QD')).toBe('K7M 2QD');
		expect(formatCodigo(null)).toBe('');
	});
});

describe('codigoFromQr', () => {
	test('reads a bare code', () => {
		expect(codigoFromQr('K7M2QD')).toBe('K7M2QD');
	});

	test('reads the code at the end of a link', () => {
		expect(codigoFromQr('https://hartazone.net/r/K7M2QD')).toBe('K7M2QD');
	});

	test('returns null when there is no code', () => {
		expect(codigoFromQr('hola')).toBeNull();
	});
});
