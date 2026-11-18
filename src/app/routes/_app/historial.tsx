import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { z } from 'zod';

import { useComercio } from '@/features/comercio/session';
import type { Reserva } from '@/features/reservas/api';
import {
	clienteNombre,
	estadoReserva,
	formatCodigo,
	grupoDe,
	reservaLabel
} from '@/features/reservas/model';
import { reservaQuery, reservasDesdeQuery } from '@/features/reservas/queries';
import { ReservaPanel } from '@/features/reservas/reserva-panel';
import { describeError } from '@/shared/models/app-error/describe-error';
import { Banner } from '@/shared/ui/hz/banner';
import { Chip } from '@/shared/ui/hz/chip';
import { Segmented } from '@/shared/ui/hz/segmented';
import { StatCard } from '@/shared/ui/hz/stat-card';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger
} from '@/shared/ui/primitives/dropdown-menu';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { addDays, formatMoment, formatMoney, isoDate } from '@/shared/utils/dates';

const FILTROS = ['todas', 'retiradas', 'canceladas', 'no-retiradas'] as const;
type Filtro = (typeof FILTROS)[number];
const RANGOS = { hoy: 'Hoy', '7': 'Últimos 7 días', '30': 'Últimos 30 días' } as const;
type Rango = keyof typeof RANGOS;

export const Route = createFileRoute('/_app/historial')({
	validateSearch: z.object({
		filtro: z.enum(FILTROS).default('todas').catch('todas'),
		rango: z.enum(['hoy', '7', '30']).default('7').catch('7'),
		reserva: z.string().optional().catch(undefined)
	}),
	component: HistorialPage
});

/** The moment that tells what happened (delivery, cancellation, expiry). */
const cuando = (r: Reserva) =>
	r.retirada_at ?? r.cancelada_at ?? r.expirada_at ?? r.finalizada_at ?? r.ventana_fin_at;

/** Screens 21–23: what happened with each reservation and how much was collected. */
function HistorialPage() {
	const { filtro, rango, reserva: openId } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { comercio } = useComercio();

	usePageInformation({
		title: 'Historial',
		description: 'Qué pasó con cada reserva y cuánto se cobró.'
	});

	const desde = isoDate(rango === 'hoy' ? new Date() : addDays(new Date(), -(Number(rango) - 1)));
	const { data, isPending, isError, error, refetch } = useQuery(
		reservasDesdeQuery(comercio.id, desde)
	);

	const finished = useMemo(
		() =>
			(data ?? [])
				.filter(r => ['entregada', 'cancelada', 'no_retirada'].includes(grupoDe(r)))
				.sort((a, b) => cuando(b).localeCompare(cuando(a))),
		[data]
	);
	const by = {
		retiradas: finished.filter(r => grupoDe(r) === 'entregada'),
		canceladas: finished.filter(r => grupoDe(r) === 'cancelada'),
		'no-retiradas': finished.filter(r => grupoDe(r) === 'no_retirada')
	};
	const rows = filtro === 'todas' ? finished : by[filtro];
	const cobrado = by.retiradas.reduce((sum, r) => sum + Number(r.monto_total), 0);

	const inList = finished.find(r => r.id === openId);
	const { data: fetched } = useQuery({
		...reservaQuery(openId ?? ''),
		enabled: !!openId && !inList && !isPending
	});
	const opened = inList ?? (openId ? fetched : undefined) ?? null;

	const setSearch = (next: Partial<{ filtro: Filtro; rango: Rango; reserva?: string }>) =>
		navigate({ search: prev => ({ ...prev, ...next }), replace: true });

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Segmented
					label="Qué pasó con la reserva"
					value={filtro}
					onChange={next => setSearch({ filtro: next })}
					items={[
						{ value: 'todas', label: `Todas (${finished.length})` },
						{ value: 'retiradas', label: `Retiradas (${by.retiradas.length})` },
						{ value: 'canceladas', label: `Canceladas (${by.canceladas.length})` },
						{
							value: 'no-retiradas',
							label: `No retiradas (${by['no-retiradas'].length})`
						}
					]}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="soft"
							size="md"
							className="rounded-full border-[1.5px] border-border-strong font-bold"
						>
							<CalendarDays /> {RANGOS[rango]}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuRadioGroup
							value={rango}
							onValueChange={value => setSearch({ rango: value as Rango })}
						>
							{Object.entries(RANGOS).map(([value, label]) => (
								<DropdownMenuRadioItem key={value} value={value}>
									{label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{isError ? (
				<div className="flex flex-col items-start gap-4">
					<Banner tone="error">{describeError(error)}</Banner>
					<Button variant="brand" size="xl" onClick={() => refetch()}>
						Volver a intentar
					</Button>
				</div>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-3">
						{isPending ? (
							[0, 1, 2].map(i => (
								<Skeleton key={i} className="h-[136px] rounded-2xl" />
							))
						) : (
							<>
								<StatCard
									value={formatMoney(cobrado)}
									label="cobrado"
									hint={`en ${by.retiradas.length} ${by.retiradas.length === 1 ? 'entrega confirmada' : 'entregas confirmadas'}`}
								/>
								<StatCard
									value={by.canceladas.length}
									label={by.canceladas.length === 1 ? 'cancelada' : 'canceladas'}
									hint="sin cobro; las unidades volvieron a quedar disponibles"
								/>
								<StatCard
									value={by['no-retiradas'].length}
									label={
										by['no-retiradas'].length === 1
											? 'no retirada'
											: 'no retiradas'
									}
									hint="sin cobro; la unidad no se volvió a vender"
								/>
							</>
						)}
					</div>

					<div className="overflow-x-auto rounded-2xl border-[1.5px] border-border bg-card">
						<table className="w-full min-w-[760px] text-left text-sm leading-5">
							<thead>
								<tr className="border-b-[1.5px] border-border text-[13px] font-medium text-muted-foreground">
									<th scope="col" className="px-4 py-3 font-medium">
										Cuándo
									</th>
									<th scope="col" className="px-4 py-3 font-medium">
										Código
									</th>
									<th scope="col" className="px-4 py-3 font-medium">
										Cliente
									</th>
									<th scope="col" className="px-4 py-3 font-medium">
										Reserva
									</th>
									<th scope="col" className="px-4 py-3 font-medium">
										Cobro
									</th>
									<th scope="col" className="px-4 py-3 font-medium">
										Qué pasó
									</th>
									<th scope="col" className="w-10 px-4 py-3">
										<span className="sr-only">Abrir</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{isPending
									? [0, 1, 2, 3].map(i => (
											<tr
												key={i}
												className="border-b border-border last:border-0"
											>
												<td colSpan={7} className="px-4 py-3.5">
													<Skeleton className="h-5 w-full" />
												</td>
											</tr>
										))
									: rows.map(r => {
											const estado = estadoReserva(r);
											return (
												<tr
													key={r.id}
													onClick={() => setSearch({ reserva: r.id })}
													className="cursor-pointer border-b border-border last:border-0 hover:bg-background"
												>
													<td className="px-4 py-3.5 whitespace-nowrap">
														{formatMoment(cuando(r))}
													</td>
													<td className="px-4 py-3.5 font-bold whitespace-nowrap">
														{formatCodigo(r.codigo)}
													</td>
													<td className="px-4 py-3.5">
														{clienteNombre(r)}
													</td>
													<td className="px-4 py-3.5">
														{reservaLabel(r)}
													</td>
													<td className="px-4 py-3.5 whitespace-nowrap">
														{grupoDe(r) === 'entregada' ? (
															<span className="font-bold">
																{formatMoney(r.monto_total)}
															</span>
														) : (
															'Sin cobro'
														)}
													</td>
													<td className="px-4 py-3.5">
														<Chip tone={estado.tone} icon={estado.icon}>
															{estado.label}
														</Chip>
													</td>
													<td className="px-4 py-3.5">
														<button
															type="button"
															aria-label={`Ver la reserva ${formatCodigo(r.codigo)}`}
															onClick={e => {
																e.stopPropagation();
																setSearch({ reserva: r.id });
															}}
															className="flex size-8 items-center justify-center rounded-full outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
														>
															<ChevronRight className="size-5" />
														</button>
													</td>
												</tr>
											);
										})}
								{!isPending && !rows.length && (
									<tr>
										<td
											colSpan={7}
											className="px-4 py-10 text-center text-muted-foreground"
										>
											No hay reservas para mostrar en este período.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<p className="text-[13px] leading-[18px] text-muted-foreground">
						Las reservas no se borran ni se editan: aquí queda todo lo que pasó. Solo
						las entregas confirmadas cuentan como dinero cobrado.
					</p>
				</>
			)}

			<ReservaPanel reserva={opened} onClose={() => setSearch({ reserva: undefined })} />
		</>
	);
}
