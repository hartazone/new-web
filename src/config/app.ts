/**
 * App-wide constants. Rename the app, change the locale or the storage keys
 * here instead of hunting for literals across the codebase.
 */
export const appConfig = {
	name: 'Hartazone',
	description: 'Portal',
	/** BCP 47 locale used by number and date formatters (`undefined` = browser locale). */
	locale: undefined as string | undefined,
	storageKeys: {
		/** Keep in sync with the inline script in index.html. */
		theme: 'app-theme',
		session: 'app-session',
		tableColumns: 'app-table-columns:'
	}
} as const;
