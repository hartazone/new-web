import { AppException, isAppError, type AppError } from './app-error';

/** What to offer next to an error message. */
export type ErrorAction = 'retry' | 'reload';

export type ErrorDescription = {
	title: string;
	description?: string;
	tone: 'error' | 'warning';
	action?: ErrorAction;
};

/**
 * User-facing summary of an AppError. Network and server errors are not the
 * user's fault, so the copy says nothing was lost and offers to retry. Edit the
 * copy here to change it everywhere.
 */
export function describeAppError(error: AppError): ErrorDescription {
	const status = 'status' in error ? error.status : undefined;

	if (error.kind === 'network' || (status != null && status >= 500)) {
		return {
			tone: 'error',
			title: 'No se pudieron guardar los cambios',
			description:
				'Revisá tu conexión a internet y volvé a intentar. No se perdió nada de lo que escribiste.',
			action: 'retry'
		};
	}
	if (status === 409) {
		return {
			tone: 'warning',
			title: 'Esto cambió mientras lo editabas',
			description:
				'Revisá la versión actual antes de guardar otra vez. No se perdió nada de lo que escribiste.',
			action: 'reload'
		};
	}
	if (status === 429) {
		return {
			tone: 'warning',
			title: 'Demasiados intentos',
			description: 'Esperá unos segundos y volvé a intentar.',
			action: 'retry'
		};
	}
	if (error.kind === 'validation') {
		const root = error.fieldErrors.root ?? error.fieldErrors.non_field_errors;
		return {
			tone: 'error',
			title: error.message || 'Revisá los campos marcados',
			description: root ? [root].flat().join(' ') : undefined
		};
	}
	return { tone: 'error', title: error.message || 'No se pudo completar la operación' };
}

/**
 * Human-readable text for anything a query or mutation can throw. A validation
 * error carries its real detail in `fieldErrors`, so those are preferred.
 */
export function describeError(e: unknown, fallback = 'No se pudo completar la operación.'): string {
	const error = e instanceof AppException ? e.error : isAppError(e) ? e : undefined;
	if (error?.kind === 'network') {
		return 'No pudimos conectarnos. Revisá tu conexión a internet y volvé a intentar.';
	}
	if (error?.kind === 'validation') {
		const messages = Object.values(error.fieldErrors).flat();
		if (messages.length) return messages.join(' ');
	}
	return error?.message || (e instanceof Error && e.message) || fallback;
}
