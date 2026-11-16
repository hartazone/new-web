import { z } from 'zod';

/**
 * Typed, validated access to environment variables.
 *
 * Every `import.meta.env.VITE_*` read goes through here so a missing or
 * malformed value fails fast at startup with a clear message instead of
 * surfacing later as `undefined`.
 */
const schema = z.object({
	VITE_API_URL: z.string().default('http://localhost:8000'),
	VITE_DEBUG: z
		.string()
		.optional()
		.transform(v => v?.toLowerCase() === 'true')
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
	throw new Error(
		`Invalid environment variables:\n${z.prettifyError(parsed.error)}\nCheck your .env file against .env.example.`
	);
}

export const env = {
	apiUrl: parsed.data.VITE_API_URL.replace(/\/$/, ''),
	debug: parsed.data.VITE_DEBUG,
	isDev: import.meta.env.DEV,
	isProd: import.meta.env.PROD
} as const;

export const apiUrl = (endpoint: string) => { return env.apiUrl + endpoint }
