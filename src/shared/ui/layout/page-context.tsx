import type { LinkOptions } from '@tanstack/react-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type PageInformation = {
	title: string;
	description?: string;
	/** Small link above the title ("← Mis ofertas"). */
	back?: { label: string; link: LinkOptions };
	/** Shows the pickup window status pill ("Retiro abierto hasta las 6:00 p. m."). */
	pickupStatus?: boolean;
};

type PageContextValue = {
	page: PageInformation | null;
	setPage: (page: PageInformation | null) => void;
};

const PageContext = createContext<PageContextValue>({ page: null, setPage: () => {} });

export function PageContextProvider({ children }: { children: ReactNode }) {
	const [page, setPage] = useState<PageInformation | null>(null);
	return <PageContext value={{ page, setPage }}>{children}</PageContext>;
}

export function usePageContext() {
	return useContext(PageContext).page;
}

/**
 * Declares the header of the current page. The shell renders it, so every
 * page shares the same yellow header. Only re-publishes when a value really
 * changes (a new object every render would loop).
 */
export function usePageInformation(info: PageInformation) {
	const { setPage } = useContext(PageContext);
	const key = JSON.stringify(info);

	useEffect(() => {
		setPage(JSON.parse(key) as PageInformation);
	}, [key, setPage]);
}
