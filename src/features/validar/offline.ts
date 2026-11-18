import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { ValidarReservaPost } from '@/features/reservas/api';
import { reservasApi } from '@/features/reservas/api';
import { reservaKeys } from '@/features/reservas/queries';
import { formatTime } from '@/shared/utils/dates';

/**
 * CU-C-34: while the device is offline, deliveries are validated against
 * the cached reservations of the day and queued here with the device time;
 * they are sent as soon as the connection comes back.
 */
const STORAGE_KEY = 'hz-validaciones-pendientes';

export type ValidacionPendiente = {
	body: ValidarReservaPost;
	reservaId: string;
	/** Device time of the delivery (the server stamps its own on arrival). */
	declaradaAt: string;
};

export type ConflictoSync = { codigo: string; mensaje: string };

function read(): ValidacionPendiente[] {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ValidacionPendiente[];
	} catch {
		return [];
	}
}

function write(items: ValidacionPendiente[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch {
		/* Storage blocked: the queue lives in memory for this tab only. */
	}
	snapshot = items;
	listeners.forEach(l => l());
}

const listeners = new Set<() => void>();
let snapshot = read();
const subscribeQueue = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};

/** Queues a delivery validated without connection. */
export function encolarValidacion(body: ValidarReservaPost, reservaId: string) {
	const declaradaAt = new Date();
	const nota = [body.nota, `Validada sin conexión a las ${formatTime(declaradaAt)}.`]
		.filter(Boolean)
		.join(' ')
		.slice(0, 500);
	write([
		...read().filter(p => p.body.codigo !== body.codigo),
		{ body: { ...body, nota }, reservaId, declaradaAt: declaradaAt.toISOString() }
	]);
}

export function usePendientes() {
	return useSyncExternalStore(subscribeQueue, () => snapshot);
}

/** Whether the browser believes it is online. */
export function useOnline() {
	return useSyncExternalStore(
		cb => {
			window.addEventListener('online', cb);
			window.addEventListener('offline', cb);
			return () => {
				window.removeEventListener('online', cb);
				window.removeEventListener('offline', cb);
			};
		},
		() => navigator.onLine
	);
}

/**
 * Sends the queued validations when the connection is back. Rejected ones
 * (the reservation was no longer deliverable) are reported as conflicts.
 */
export function useSincronizarValidaciones() {
	const online = useOnline();
	const pendientes = usePendientes();
	const queryClient = useQueryClient();
	const [conflictos, setConflictos] = useState<ConflictoSync[]>([]);
	const syncing = useRef(false);

	const sync = useCallback(async () => {
		if (syncing.current) return;
		syncing.current = true;
		const nuevos: ConflictoSync[] = [];
		for (const item of read()) {
			const result = await reservasApi.validar(item.body);
			if (result.isOk()) {
				write(read().filter(p => p.body.codigo !== item.body.codigo));
			} else if (result.error.kind === 'network') {
				break;
			} else {
				nuevos.push({ codigo: item.body.codigo, mensaje: result.error.message });
				write(read().filter(p => p.body.codigo !== item.body.codigo));
			}
		}
		syncing.current = false;
		if (nuevos.length) setConflictos(c => [...c, ...nuevos]);
		void queryClient.invalidateQueries({ queryKey: reservaKeys.all });
	}, [queryClient]);

	useEffect(() => {
		// State only changes after the requests resolve, never synchronously here.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (online && pendientes.length) void sync();
	}, [online, pendientes.length, sync]);

	return { online, pendientes, conflictos, dismissConflictos: () => setConflictos([]) };
}
