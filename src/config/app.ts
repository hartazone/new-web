/**
 * App-wide constants. Rename the app, change the locale or the storage keys
 * here instead of hunting for literals across the codebase.
 */
export const appConfig = {
	name: 'Hartazone',
	description: 'Portal de negocios',
	/** BCP 47 locale used by number and date formatters (`undefined` = browser locale). */
	locale: 'es-NI' as string | undefined,
	storageKeys: {
		/** Keep in sync with the inline script in index.html. */
		theme: 'app-theme',
		session: 'app-session',
		/** Business the user chose to operate (people can belong to several). */
		comercio: 'hz-comercio',
		tableColumns: 'app-table-columns:'
	}
} as const;
