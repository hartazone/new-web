/*
 * Date, time and money helpers with the wording the design uses
 * ("Hoy, 5:00 p. m. a 6:00 p. m.", "Jueves 12 de noviembre", "C$ 60.00").
 * Everything is local time: the business operates in its own time zone and
 * `fecha_operativa` is a local calendar date.
 */

const LOCALE = 'es-NI';

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
	hour: 'numeric',
	minute: '2-digit',
	hour12: true
});
const longDateFormat = new Intl.DateTimeFormat(LOCALE, {
	weekday: 'long',
	day: 'numeric',
	month: 'long'
});
const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' });
const shortDateFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
const moneyFormat = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Parses an ISO date-time, or a date-only value as a local day. */
export function toDate(value: string | Date): Date {
	if (value instanceof Date) return value;
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

/** Local calendar date as `YYYY-MM-DD`. */
export function isoDate(date: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}

/** Combines a local date (`YYYY-MM-DD`) and a time (`HH:MM[:SS]`) into a Date. */
export function atTime(day: string, time: string): Date {
	const [h = '0', m = '0', s = '0'] = time.split(':');
	const date = toDate(day);
	date.setHours(Number(h), Number(m), Number(s), 0);
	return date;
}

/** "5:00 p. m." */
export function formatTime(value: string | Date): string {
	return timeFormat.format(toDate(value)).replace(/\s/g, ' ');
}

/** "5:00 p. m." from a bare `HH:MM:SS` time. */
export function formatClock(time: string): string {
	return formatTime(atTime(isoDate(), time));
}

/** "Jueves 12 de noviembre" */
export function formatLongDate(value: string | Date): string {
	return capitalize(longDateFormat.format(toDate(value)).replace(',', ''));
}

/** "jueves" */
export function formatWeekday(value: string | Date): string {
	return weekdayFormat.format(toDate(value));
}

/** "12 nov" */
export function formatShortDate(value: string | Date): string {
	return shortDateFormat.format(toDate(value)).replace('.', '');
}

/** "Hoy", "Ayer", "Mañana" or "12 nov". */
export function formatRelativeDay(value: string | Date, now = new Date()): string {
	const day = isoDate(toDate(value));
	if (day === isoDate(now)) return 'Hoy';
	if (day === isoDate(addDays(now, -1))) return 'Ayer';
	if (day === isoDate(addDays(now, 1))) return 'Mañana';
	return formatShortDate(value);
}

/** "Hoy, 5:06 p. m." */
export function formatMoment(value: string | Date, now = new Date()): string {
	return `${formatRelativeDay(value, now)}, ${formatTime(value)}`;
}

/** "5:00 p. m. a 6:00 p. m." */
export function formatRange(start: string | Date, end: string | Date): string {
	return `${formatTime(start)} a ${formatTime(end)}`;
}

/** "C$ 60.00" (córdobas). Accepts the API's decimal strings. */
export function formatMoney(value: string | number | null | undefined): string {
	const amount = typeof value === 'string' ? Number(value) : (value ?? 0);
	return `C$ ${moneyFormat.format(Number.isFinite(amount) ? amount : 0)}`;
}

/** Parses "C$ 1,200.50", "1200.5" or "60" into a number (NaN when empty). */
export function parseMoney(text: string): number {
	const clean = text.replace(/[^\d.]/g, '');
	return clean ? Number(clean) : Number.NaN;
}

/** "Hola" greeting name: the first word of a full name. */
export function firstName(name: string | null | undefined): string {
	return (name ?? '').trim().split(/\s+/)[0] ?? '';
}
