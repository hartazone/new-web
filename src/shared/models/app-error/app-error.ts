import { ResultAsync } from 'neverthrow';
import { type FieldValues, type UseFormReturn } from 'react-hook-form';

import { applyAppErrorToForm } from './apply-error-to-form';

/**
 * Typed, consistent error model for the whole application.
 *
 * `AppError` is a discriminated union on `kind`. It replaces stringly-typed
 * errors (`throw new Error('something failed')`, comparing `error.message`…)
 * with an explicit contract TypeScript can check exhaustively.
 *
 * It is the `E` of every `Result<T, AppError>` / `ResultAsync<T, AppError>`
 * (neverthrow) returned by services and adapters. When a value has to be
 * *thrown* (TanStack Query needs that), it is wrapped in an `AppException`.
 */

/** Fields shared by every AppError variant. */
interface BaseAppError {
	/** Message meant for users or logs. */
	message: string;
	/** Original error/exception, for debugging. */
	cause?: unknown;
}

/** Could not reach the server: fetch failure, offline, timeout, DNS, CORS… */
export interface NetworkAppError extends BaseAppError {
	kind: 'network';
}

/** Error HTTP response that does not fit a more specific variant. */
export interface HttpAppError extends BaseAppError {
	kind: 'http';
	status: number;
	code?: string;
}

/** 401: not authenticated, or the session expired and could not be refreshed. */
export interface UnauthorizedAppError extends BaseAppError {
	kind: 'unauthorized';
	status: 401;
	code?: string;
}

/** 403: authenticated but not allowed. */
export interface ForbiddenAppError extends BaseAppError {
	kind: 'forbidden';
	status: 403;
	code?: string;
}

/** 404: the resource does not exist. */
export interface NotFoundAppError extends BaseAppError {
	kind: 'notFound';
	status: 404;
	/** Optional identifier of what was not found. */
	resource?: string;
}

/**
 * Validation error (400/422 with `field_errors`). `fieldErrors` maps a field
 * path (`name`, `address.city`, `root`) to one or more messages and can be fed
 * straight into a form with `AppError.applyToForm`.
 */
export interface ValidationAppError extends BaseAppError {
	kind: 'validation';
	status?: number;
	code?: string;
	fieldErrors: Record<string, string | string[]>;
}

/** The response body could not be interpreted (invalid JSON, schema mismatch…). */
export interface ParseAppError extends BaseAppError {
	kind: 'parse';
}

/** The request succeeded but did not carry the expected data. */
export interface EmptyAppError extends BaseAppError {
	kind: 'empty';
}

/** Anything else, raised on purpose by application code. */
export interface CustomAppError extends BaseAppError {
	kind: 'custom';
}

/** Unknown error. */
export interface UnknownAppError extends BaseAppError {
	kind: 'unknown';
}

export type AppError =
	| NetworkAppError
	| HttpAppError
	| UnauthorizedAppError
	| ForbiddenAppError
	| NotFoundAppError
	| ValidationAppError
	| ParseAppError
	| EmptyAppError
	| CustomAppError
	| UnknownAppError;

export type AppErrorKind = AppError['kind'];

/** Factories, so call sites never type the `kind` literal by hand. */
export const AppErrors = {
	network(message = 'Could not connect to the server', cause?: unknown): NetworkAppError {
		return { kind: 'network', message, cause };
	},

	http(status: number, message: string, code?: string, cause?: unknown): HttpAppError {
		return { kind: 'http', status, message, code, cause };
	},

	unauthorized(
		message = 'You are not signed in or your session expired',
		code?: string
	): UnauthorizedAppError {
		return { kind: 'unauthorized', status: 401, message, code };
	},

	forbidden(
		message = 'You do not have permission to perform this action',
		code?: string
	): ForbiddenAppError {
		return { kind: 'forbidden', status: 403, message, code };
	},

	notFound(
		message = 'The requested resource does not exist',
		resource?: string
	): NotFoundAppError {
		return { kind: 'notFound', status: 404, message, resource };
	},

	validation(
		fieldErrors: Record<string, string | string[]>,
		message = 'Some fields are invalid',
		status?: number
	): ValidationAppError {
		return { kind: 'validation', fieldErrors, message, status };
	},

	parse(message = 'Could not read the server response', cause?: unknown): ParseAppError {
		return { kind: 'parse', message, cause };
	},

	empty(message = 'The response did not contain the expected data'): EmptyAppError {
		return { kind: 'empty', message };
	},

	custom(message: string): CustomAppError {
		return { kind: 'custom', message };
	},

	unknown(message = 'Unknown error', cause?: unknown): UnknownAppError {
		return { kind: 'unknown', message, cause };
	}
} as const;

/** Whether an unknown value already is an AppError. */
export function isAppError(value: unknown): value is AppError {
	return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value;
}

/** Shape of an error body. Adapt this (and `fromResponse`) to your backend's convention. */
type ErrorBody = {
	detail?: string;
	message?: string;
	code?: string;
	field_errors?: Record<string, string | string[]>;
};

/**
 * Builds an AppError from a failed `Response`, or `undefined` for a 2xx.
 *
 * Expects bodies like `{ detail, code?, field_errors? }` (see
 * `openapi/schema.json`). Non-JSON bodies fall back to the status text.
 */
export async function fromResponse(response: Response): Promise<AppError | undefined> {
	if (response.ok) return undefined;
	if (response.status === 0) return AppErrors.network();

	let data: ErrorBody = {};
	try {
		const json: unknown = await response.clone().json();
		if (json && typeof json === 'object') data = json as ErrorBody;
	} catch {
		/* Not JSON: keep the defaults below. */
	}

	const detail = data.detail ?? data.message;
	const fieldErrors = data.field_errors;

	switch (response.status) {
		case 400:
		case 422:
			if (fieldErrors && Object.keys(fieldErrors).length > 0) {
				return AppErrors.validation(fieldErrors, detail, response.status);
			}
			return AppErrors.http(
				response.status,
				detail ?? `Request failed (${response.status})`,
				data.code
			);
		case 401:
			return AppErrors.unauthorized(detail, data.code);
		case 403:
			return AppErrors.forbidden(detail, data.code);
		case 404:
			return AppErrors.notFound(detail);
		default:
			return AppErrors.http(
				response.status,
				detail ?? `Request failed (${response.status})`,
				data.code
			);
	}
}

/**
 * Use in the `default` branch of an exhaustive `switch (error.kind)`: adding a
 * new variant without handling it becomes a compile error.
 */
export function assertUnreachableAppError(value: never): never {
	throw new Error(`Unhandled AppError kind: ${JSON.stringify(value)}`);
}

/**
 * Throwable wrapper around an AppError.
 *
 * TanStack Query (and any `queryFn`/`mutationFn`) needs failures to be
 * *thrown*. `AppException extends Error`, so it works everywhere an `Error`
 * does, while exposing the discriminated `AppError` in `.error`.
 */
export class AppException extends Error {
	readonly error: AppError;

	constructor(error: AppError) {
		super(error.message);
		this.name = 'AppException';
		this.error = error;
		if (error.cause !== undefined) this.cause = error.cause;
	}
}

/** Normalizes anything caught in a `catch` (or a rejection reason) into an AppError. */
export function toAppError(error: unknown): AppError {
	if (isAppError(error)) return error;
	if (error instanceof AppException) return error.error;
	if (error instanceof Error) return AppErrors.custom(error.message);
	return AppErrors.unknown();
}

/** Namespace with the helpers most call sites need. */
export const AppError = {
	isAppError,
	isValidationError: (error: unknown): error is ValidationAppError =>
		isAppError(error) && error.kind === 'validation',
	/** Writes server-side errors into a react-hook-form instance. */
	applyToForm: <TI extends FieldValues, TO extends FieldValues>(
		error: AppError,
		form: UseFormReturn<TI, unknown, TO>
	) => applyAppErrorToForm(error, form),
	makeFrom: (error: unknown): AppError => toAppError(error),
	fromResponse,
	toResult: <T>(promise: Promise<T>) => ResultAsync.fromPromise(promise, toAppError),
};
