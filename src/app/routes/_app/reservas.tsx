import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { z } from 'zod';

import { useComercio } from '@/features/comercio/session';
import type { Reserva } from '@/features/reservas/api';
import { agrupar } from '@/features/reservas/model';
import { reservasDelDiaQuery } from '@/features/reservas/queries';
import { ReservaPanel } from '@/features/reservas/reserva-panel';
import { ReservaTicket, ReservaTicketSkeleton } from '@/features/reservas/reserva-ticket';
import { Banner } from '@/shared/ui/hz/banner';
import { HarturitoMessage } from '@/shared/ui/hz/harturito';
import { Segmented } from '@/shared/ui/hz/segmented';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import { formatRange, isoDate } from '@/shared/utils/dates';

const TABS = ['por-retirar', 'entregadas', 'canceladas'] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute('/_app/reservas')({
	validateSearch: z.object({
		tab: z.enum(TABS).default('por-retirar').catch('por-retirar'),
		/** Reservation open in the side panel. */
		reserva: z.string().optional().catch(undefined)
	}),
	component: ReservasPage
});

/** Screens 12, 13, 24, 26, 27 and 31: what people are coming to pick up today. */
function ReservasPage() {
	const { tab, reserva: openId } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { comercio } = useComercio();

	usePageInformation({
		title: 'Reservas',
		description: 'Lo que te van a llegar a retirar hoy.',
		pickupStatus: true
	});

	const { data, isPending, isError, refetch, isRefetching } = useQuery(
		reservasDelDiaQuery(comercio.id, isoDate())
	);
	const groups = useMemo(() => agrupar(data ?? []), [data]);
	const list: Record<Tab, Reserva[]> = {
		'por-retirar': groups.por_retirar,
		entregadas: groups.entregada,
		canceladas: [...groups.cancelada, ...groups.no_retirada]
	};
	const current = list[tab];
	const opened = data?.find(r => r.id === openId) ?? null;
	const setSearch = (next: { tab?: Tab; reserva?: string }) =>
		navigate({ search: prev => ({ ...prev, ...next }), replace: true });

	return (
		<>
			<Segmented
				label="Estado de las reservas"
				value={tab}
				onChange={next => setSearch({ tab: next, reserva: undefined })}
				items={[
					{ value: 'por-retirar', label: `Por retirar (${list['por-retirar'].length})` },
					{ value: 'entregadas', label: `Entregadas (${list.entregadas.length})` },
					{ value: 'canceladas', label: `Canceladas (${list.canceladas.length})` }
				]}
			/>

			{isPending ? (
				<section className="flex flex-col gap-3" aria-busy>
					<p className="text-sm leading-5 font-medium text-muted-foreground">
						Trayendo las reservas de hoy
					</p>
					<ReservaTicketSkeleton />
					<ReservaTicketSkeleton />
					<ReservaTicketSkeleton faded />
				</section>
			) : isError ? (
				<div className="flex flex-col gap-4">
					<Banner tone="error">
						No pudimos traer las reservas. Revisá tu conexión a internet y volvé a
						intentar.
					</Banner>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							variant="brand"
							size="xl"
							disabled={isRefetching}
							onClick={() => refetch()}
						>
							Volver a intentar
						</Button>
						<p className="text-[13px] leading-[18px] text-muted-foreground">
							Si el cliente ya está en el mostrador, podés validar su código con
							Validar entrega.
						</p>
					</div>
				</div>
			) : !data?.length ? (
				<div className="flex flex-col items-center gap-4 py-10">
					<HarturitoMessage title="Todavía no hay reservas hoy" className="max-w-[420px]">
						Cuando alguien reserve te aviso aquí. Mientras, mirá que tus ofertas estén
						publicadas.
					</HarturitoMessage>
					<Button variant="soft" size="md" asChild>
						<Link to="/ofertas">Ir a Mis ofertas</Link>
					</Button>
				</div>
			) : !current.length ? (
				<p className="py-10 text-center text-base text-muted-foreground">
					{tab === 'por-retirar'
						? 'No queda nadie por retirar hoy.'
						: tab === 'entregadas'
							? 'Todavía no entregaste ninguna reserva hoy.'
							: 'No hay reservas canceladas hoy.'}
				</p>
			) : (
				<>
					{byWindow(current).map(group => (
						<section key={group.key} className="flex flex-col gap-3">
							<h2 className="text-sm leading-5 font-medium text-muted-foreground">
								Retiro de {formatRange(group.inicio, group.fin)}
							</h2>
							{group.items.map(r => (
								<ReservaTicket
									key={r.id}
									reserva={r}
									onOpen={() => setSearch({ reserva: r.id })}
								/>
							))}
						</section>
					))}
					{tab === 'por-retirar' && (
						<Banner>
							Para entregar, pedí el código al cliente y tocá Validar entrega.
						</Banner>
					)}
				</>
			)}

			<ReservaPanel reserva={opened} onClose={() => setSearch({ reserva: undefined })} />
		</>
	);
}

/** Groups reservations by pickup window ("Retiro de 5:00 p. m. a 6:00 p. m."). */
function byWindow(reservas: Reserva[]) {
	const groups = new Map<
		string,
		{ key: string; inicio: string; fin: string; items: Reserva[] }
	>();
	for (const r of reservas) {
		const key = `${r.ventana_inicio_at}|${r.ventana_fin_at}`;
		const group = groups.get(key) ?? {
			key,
			inicio: r.ventana_inicio_at,
			fin: r.ventana_fin_at,
			items: []
		};
		group.items.push(r);
		groups.set(key, group);
	}
	return [...groups.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
}
