import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { appConfig } from '@/config/app';
import { useCurrentUser } from '@/features/auth/session';
import { unwrapOrThrow } from '@/shared/models/result/result';

import { comercioApi, type Comercio, type UsuarioComercio } from './api';

export const comercioKeys = {
	all: ['comercio'] as const,
	list: ['comercio', 'list'] as const,
	detail: (id: string) => ['comercio', id] as const,
	membership: (id: string, usuarioId: string) =>
		['comercio', id, 'membership', usuarioId] as const,
	horarios: (id: string) => ['comercio', id, 'horarios'] as const,
	ventanas: (id: string) => ['comercio', id, 'ventanas'] as const,
	pausas: (id: string) => ['comercio', id, 'pausas'] as const
};

export const comerciosQuery = queryOptions({
	queryKey: comercioKeys.list,
	queryFn: () => unwrapOrThrow(comercioApi.list()),
	staleTime: 5 * 60_000
});

export const membershipQuery = (comercioId: string, usuarioId: string) =>
	queryOptions({
		queryKey: comercioKeys.membership(comercioId, usuarioId),
		queryFn: () => unwrapOrThrow(comercioApi.membership(comercioId, usuarioId)),
		staleTime: 10 * 60_000
	});

export const horariosQuery = (comercioId: string) =>
	queryOptions({
		queryKey: comercioKeys.horarios(comercioId),
		queryFn: () => unwrapOrThrow(comercioApi.horarios(comercioId)),
		staleTime: 5 * 60_000
	});

export const ventanasQuery = (comercioId: string) =>
	queryOptions({
		queryKey: comercioKeys.ventanas(comercioId),
		queryFn: () => unwrapOrThrow(comercioApi.ventanas(comercioId)),
		staleTime: 5 * 60_000
	});

export const pausasQuery = (comercioId: string) =>
	queryOptions({
		queryKey: comercioKeys.pausas(comercioId),
		queryFn: () => unwrapOrThrow(comercioApi.pausas(comercioId))
	});

const STORAGE_KEY = appConfig.storageKeys.comercio;

function readStoredId(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function storeId(id: string) {
	try {
		localStorage.setItem(STORAGE_KEY, id);
	} catch {
		/* Not persisted: the first business is picked again next time. */
	}
}

/** The business stored from a previous visit, or the first one available. */
export function pickComercio(comercios: Comercio[], storedId = readStoredId()): Comercio | null {
	return comercios.find(c => c.id === storedId) ?? comercios[0] ?? null;
}

type ComercioContextValue = {
	comercio: Comercio;
	comercios: Comercio[];
	/** Membership of the signed-in user (role and the id that signs actions). */
	membership: UsuarioComercio | null;
	selectComercio: (id: string) => void;
};

const ComercioContext = createContext<ComercioContextValue | null>(null);

/**
 * Scopes the authenticated area to one business. People who belong to
 * several businesses choose which one to operate (CU-C-05); the choice
 * survives reloads.
 */
export function ComercioProvider({
	comercios,
	children
}: {
	comercios: Comercio[];
	children: ReactNode;
}) {
	const queryClient = useQueryClient();
	const user = useCurrentUser();
	const [selectedId, setSelectedId] = useState(() => pickComercio(comercios)?.id ?? null);
	const comercio = comercios.find(c => c.id === selectedId) ?? comercios[0];

	const { data: membership = null } = useQuery({
		...membershipQuery(comercio.id, user?.id ?? ''),
		enabled: !!user
	});

	const selectComercio = useCallback(
		(id: string) => {
			storeId(id);
			setSelectedId(id);
			// Everything below the business (offers, reservations…) belongs to the old one.
			queryClient.removeQueries({ queryKey: ['ofertas'] });
			queryClient.removeQueries({ queryKey: ['reservas'] });
		},
		[queryClient]
	);

	const value = useMemo(
		() => ({ comercio, comercios, membership, selectComercio }),
		[comercio, comercios, membership, selectComercio]
	);

	return <ComercioContext value={value}>{children}</ComercioContext>;
}

export function useComercio(): ComercioContextValue {
	const value = useContext(ComercioContext);
	if (!value) throw new Error('useComercio must be used inside <ComercioProvider>');
	return value;
}

/** "Administrador" / "Operador", from the membership group. */
export function roleLabel(membership: UsuarioComercio | null): string {
	const name = membership?.grupo.name ?? '';
	if (/admin/i.test(name)) return 'Administrador';
	if (/oper/i.test(name)) return 'Operador';
	return name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Equipo del negocio';
}
