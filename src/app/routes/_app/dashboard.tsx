import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check, CircleDashed, Plus } from 'lucide-react';

import { useCurrentUser } from '@/features/auth/session';
import { resumenHorario, resumenVentanas } from '@/features/comercio/horario';
import { horariosQuery, useComercio, ventanasQuery } from '@/features/comercio/session';
import { OfertaRow } from '@/features/ofertas/oferta-row';
import { publicacionesQuery } from '@/features/ofertas/queries';
import { agrupar } from '@/features/reservas/model';
import { reservasDelDiaQuery } from '@/features/reservas/queries';
import { ReservaTicket, ReservaTicketSkeleton } from '@/features/reservas/reserva-ticket';
import { useNow } from '@/shared/hooks/use-now';
import { Banner } from '@/shared/ui/hz/banner';
import { HarturitoMessage } from '@/shared/ui/hz/harturito';
import { Muted, Panel, PanelTitle } from '@/shared/ui/hz/panel';
import { NoteCard, StatCard } from '@/shared/ui/hz/stat-card';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { cn } from '@/shared/utils';
import { firstName, formatLongDate, formatMoney, formatTime, isoDate } from '@/shared/utils/dates';

export const Route = createFileRoute('/_app/dashboard')({
	component: InicioPage
});

/** Screens 02 (first time), 11 and 16b (day in progress). */
function InicioPage() {
	const user = useCurrentUser();
	const { comercio } = useComercio();
	const now = useNow();
	const today = isoDate(now);

	const ofertas = useQuery(publicacionesQuery(comercio.id, { fecha_operativa: today }));
	const reservas = useQuery(reservasDelDiaQuery(comercio.id, today));

	const loading = ofertas.isPending || reservas.isPending;
	const activo = !!ofertas.data?.length || !!reservas.data?.length;
	const primeraVez = !comercio.ultima_publicacion_at && !activo;

	usePageInformation({
		title: `${primeraVez ? 'Bienvenido' : 'Hola'}, ${firstName(user?.first_name) || 'equipo'}`,
		description: activo ? `${formatLongDate(now)}, ${formatTime(now)}` : formatLongDate(now),
		pickupStatus: activo
	});

	if (loading) {
		return (
			<>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{[0, 1, 2, 3].map(i => (
						<Skeleton key={i} className="h-[136px] rounded-2xl" />
					))}
				</div>
				<ReservaTicketSkeleton />
				<ReservaTicketSkeleton faded />
			</>
		);
	}

	if (ofertas.isError || reservas.isError) {
		return (
			<div className="flex flex-col items-start gap-4">
				<Banner tone="error">
					No pudimos traer lo de hoy. Revisá tu conexión a internet y volvé a intentar.
				</Banner>
				<Button
					variant="brand"
					size="xl"
					onClick={() => {
						void ofertas.refetch();
						void reservas.refetch();
					}}
				>
					Volver a intentar
				</Button>
			</div>
		);
	}

	return activo ? <DiaEnCurso /> : <SinActividad primeraVez={primeraVez} />;
}

/** Nothing published today: the setup checklist and the call to publish. */
function SinActividad({ primeraVez }: { primeraVez: boolean }) {
	const { comercio } = useComercio();
	const horarios = useQuery(horariosQuery(comercio.id));
	const ventanas = useQuery(ventanasQuery(comercio.id));

	const horario = horarios.data ? resumenHorario(horarios.data) : null;
	const retiros = ventanas.data ? resumenVentanas(ventanas.data) : [];
	const pasos = [
		{
			label: 'Logo de tu negocio',
			ok: !!comercio.logo,
			detail: comercio.logo ? 'Listo' : 'Falta subirlo'
		},
		{
			label: 'Horario de atención',
			ok: !!horario && horario !== 'Cerrado toda la semana',
			detail: horario ?? 'Falta configurarlo'
		},
		{
			label: 'Horario de retiro',
			ok: retiros.length > 0,
			detail: retiros.join(' · ') || 'Falta configurarlo'
		}
	];
	const faltan = pasos.filter(p => !p.ok).length;
	const cargando = horarios.isPending || ventanas.isPending;

	return (
		<>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
				<Panel>
					<PanelTitle>Antes de publicar</PanelTitle>
					<Muted>
						Estos tres datos se piden una sola vez y después se reutilizan en cada
						oferta.
					</Muted>
					<ul className="flex flex-col">
						{pasos.map(p => (
							<li key={p.label} className="flex items-center gap-3 py-3">
								<span
									className={cn(
										'flex size-8 shrink-0 items-center justify-center rounded-full',
										p.ok
											? 'bg-success-background text-success'
											: 'bg-warning-background'
									)}
								>
									{p.ok ? (
										<Check
											className="size-[18px] stroke-[2.5]"
											aria-label="Listo"
										/>
									) : (
										<CircleDashed
											className="size-[18px]"
											aria-label="Pendiente"
										/>
									)}
								</span>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="text-base leading-6 font-bold">{p.label}</span>
									{cargando && p.label !== 'Logo de tu negocio' ? (
										<Skeleton className="mt-1 h-4 w-48" />
									) : (
										<span className="text-sm leading-5 text-muted-foreground">
											{p.detail}
										</span>
									)}
								</span>
								<Button variant="plain" size="xl" className="px-3" asChild>
									<Link to="/negocio">Cambiar</Link>
								</Button>
							</li>
						))}
					</ul>
				</Panel>

				<section className="flex flex-col gap-6 rounded-2xl border-[1.5px] border-border-strong bg-warning-background p-6 md:p-8">
					<HarturitoMessage
						title={
							cargando || !faltan
								? primeraVez
									? 'Ya tenés todo listo'
									: 'Todavía no publicaste nada hoy'
								: `Te ${faltan === 1 ? 'falta 1 dato' : `faltan ${faltan} datos`} para publicar`
						}
					>
						{cargando || !faltan
							? primeraVez
								? 'Mirá, es aquí: publicá tu primera oferta y te aviso cuando alguien reserve.'
								: 'Publicá lo que te sobra del día y te aviso cuando alguien reserve.'
							: 'Completalos en Mi negocio y después publicá tu primera oferta.'}
					</HarturitoMessage>
					<Button variant="brand" size="xl" className="w-fit" asChild>
						<Link to="/ofertas/nueva">
							<Plus />{' '}
							{primeraVez ? 'Publicar mi primera oferta' : 'Publicar una oferta'}
						</Link>
					</Button>
				</section>
			</div>

			<Panel>
				<PanelTitle>Hoy</PanelTitle>
				<div className="flex flex-col items-center gap-1 py-6 text-center">
					<p className="text-lg leading-[26px] font-medium">
						Todavía no hay ofertas ni reservas hoy
					</p>
					<p className="text-base leading-6 text-muted-foreground">
						Cuando publiqués, aquí vas a ver cuántas unidades quedan y quién viene a
						retirar.
					</p>
				</div>
			</Panel>
		</>
	);
}

/** Today's numbers, who is coming next and how much is left of each offer. */
function DiaEnCurso() {
	const { comercio } = useComercio();
	const navigate = useNavigate();
	const today = isoDate();
	const { data: ofertas = [] } = useQuery(
		publicacionesQuery(comercio.id, { fecha_operativa: today })
	);
	const { data: reservas = [] } = useQuery(reservasDelDiaQuery(comercio.id, today));

	const groups = agrupar(reservas);
	const porCobrar = groups.por_retirar.reduce((sum, r) => sum + Number(r.monto_total), 0);
	const cobrado = groups.entregada.reduce((sum, r) => sum + Number(r.monto_total), 0);
	const abiertas = ofertas.filter(o => o.estado.codigo === 'publicada');
	const disponibles = abiertas.reduce((sum, o) => sum + o.cantidad_disponible, 0);

	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					value={groups.por_retirar.length}
					label="por retirar"
					hint={`${formatMoney(porCobrar)} por cobrar`}
				/>
				<StatCard
					value={groups.entregada.length}
					label={groups.entregada.length === 1 ? 'entregada' : 'entregadas'}
					hint={`${formatMoney(cobrado)} cobrados`}
				/>
				<StatCard
					value={disponibles}
					label={disponibles === 1 ? 'disponible' : 'disponibles'}
					hint={`en ${abiertas.length} ${abiertas.length === 1 ? 'oferta publicada' : 'ofertas publicadas'}`}
				/>
				<NoteCard title="Reservado no es cobrado">
					El dinero cuenta cuando validás el código y confirmás la entrega.
				</NoteCard>
			</div>

			{groups.por_retirar.length > 0 && (
				<Panel>
					<PanelTitle
						action={
							<Button variant="plain" size="xl" className="px-3" asChild>
								<Link to="/reservas">Ver todas</Link>
							</Button>
						}
					>
						Por retirar ahora
					</PanelTitle>
					{groups.por_retirar.slice(0, 4).map(r => (
						<ReservaTicket
							key={r.id}
							reserva={r}
							onOpen={() => navigate({ to: '/reservas', search: { reserva: r.id } })}
						/>
					))}
				</Panel>
			)}

			<Panel>
				<PanelTitle
					action={
						<Button variant="plain" size="xl" className="px-3" asChild>
							<Link to="/ofertas/nueva">
								<Plus /> Nueva oferta
							</Link>
						</Button>
					}
				>
					Tus ofertas de hoy
				</PanelTitle>
				{ofertas.length ? (
					ofertas.map(o => (
						<OfertaRow
							key={o.id}
							publicacion={o}
							onOpen={() => navigate({ to: '/ofertas', search: { oferta: o.id } })}
						/>
					))
				) : (
					<Muted>
						Hoy no publicaste ofertas. Las reservas de arriba son de ofertas anteriores.
					</Muted>
				)}
			</Panel>
		</>
	);
}
