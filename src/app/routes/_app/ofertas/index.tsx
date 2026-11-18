import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { z } from 'zod';

import { useComercio } from '@/features/comercio/session';
import type { Publicacion, PublicacionFilters } from '@/features/ofertas/api';
import { minutosCierreAntes } from '@/features/ofertas/model';
import { OfertaPanel } from '@/features/ofertas/oferta-panel';
import { OfertaRow } from '@/features/ofertas/oferta-row';
import { publicacionesQuery } from '@/features/ofertas/queries';
import { describeError } from '@/shared/models/app-error/describe-error';
import { Banner } from '@/shared/ui/hz/banner';
import { HarturitoMessage } from '@/shared/ui/hz/harturito';
import { Segmented } from '@/shared/ui/hz/segmented';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { addDays, formatLongDate, formatTime, isoDate } from '@/shared/utils/dates';

const DIAS = ['hoy', 'manana', 'anteriores'] as const;
type Dia = (typeof DIAS)[number];

export const Route = createFileRoute('/_app/ofertas/')({
	validateSearch: z.object({
		dia: z.enum(DIAS).default('hoy').catch('hoy'),
		/** Offer open in the side panel. */
		oferta: z.string().optional().catch(undefined),
		/** Set right after publishing, to celebrate the first offer. */
		publicada: z.boolean().optional().catch(undefined)
	}),
	component: MisOfertasPage
});

function filtersFor(dia: Dia): PublicacionFilters {
	const today = new Date();
	if (dia === 'hoy') return { fecha_operativa: isoDate(today) };
	if (dia === 'manana') return { fecha_operativa: isoDate(addDays(today, 1)) };
	const startOfToday = new Date(`${isoDate(today)}T00:00:00`);
	return { reservas_cierran_at_before: startOfToday.toISOString(), order: '-fecha_operativa' };
}

/** Screens 06, 07, 08b and 10: what is published and how much is left. */
function MisOfertasPage() {
	const { dia, oferta, publicada } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { comercio } = useComercio();

	usePageInformation({
		title: 'Mis ofertas',
		description: 'Lo que tenés publicado y cuánto queda.'
	});

	const filters = useMemo(() => filtersFor(dia), [dia]);
	const { data, isPending, isError, error, refetch } = useQuery(
		publicacionesQuery(comercio.id, filters)
	);

	const groups = useMemo(() => groupByDay(data ?? []), [data]);
	const open = (id: string | undefined) =>
		navigate({
			search: prev => ({ ...prev, oferta: id, publicada: undefined }),
			replace: true
		});

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<Segmented
					label="Día de las ofertas"
					value={dia}
					onChange={next => navigate({ search: { dia: next }, replace: true })}
					items={[
						{ value: 'hoy', label: 'Hoy' },
						{ value: 'manana', label: 'Mañana' },
						{ value: 'anteriores', label: 'Anteriores' }
					]}
				/>
				<Button variant="brand" size="xl" asChild>
					<Link to="/ofertas/nueva">
						<Plus /> Nueva oferta
					</Link>
				</Button>
			</div>

			{isPending ? (
				<div className="flex flex-col gap-3">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-[90px] rounded-2xl" />
					<Skeleton className="h-[90px] rounded-2xl" />
				</div>
			) : isError ? (
				<div className="flex flex-col items-start gap-4">
					<Banner tone="error">{describeError(error)}</Banner>
					<Button variant="brand" size="xl" onClick={() => refetch()}>
						Volver a intentar
					</Button>
				</div>
			) : !groups.length ? (
				<EmptyOfertas dia={dia} />
			) : (
				<>
					{groups.map(group => (
						<section key={group.day} className="flex flex-col gap-3">
							<h2 className="text-sm leading-5 font-medium text-muted-foreground">
								{formatLongDate(group.day)}
							</h2>
							{group.items.map(p => (
								<OfertaRow key={p.id} publicacion={p} onOpen={() => open(p.id)} />
							))}
						</section>
					))}
					{publicada && data?.length === 1 ? (
						<HarturitoMessage
							title="Tu primera oferta ya está en la app"
							className="max-w-[440px]"
						>
							Mirá, es aquí: cuando alguien reserve te aviso en Inicio y en Reservas.
						</HarturitoMessage>
					) : (
						dia !== 'anteriores' && <OfertasHint publicaciones={data ?? []} />
					)}
				</>
			)}

			<OfertaPanel publicacionId={oferta ?? null} onClose={() => open(undefined)} />
		</>
	);
}

function OfertasHint({ publicaciones }: { publicaciones: Publicacion[] }) {
	if (publicaciones.some(p => p.estado.codigo === 'agotada')) {
		return (
			<Banner>
				Si te queda más comida, abrí la oferta y subí las unidades: vuelve a publicarse
				sola.
			</Banner>
		);
	}
	const abierta = publicaciones.find(p => p.estado.codigo === 'publicada');
	if (!abierta) return null;
	return (
		<Banner>
			Las reservas cierran a las {formatTime(abierta.reservas_cierran_at)},{' '}
			{minutosCierreAntes(abierta)} minutos antes de que termine el retiro.
		</Banner>
	);
}

function EmptyOfertas({ dia }: { dia: Dia }) {
	const title =
		dia === 'anteriores'
			? 'Todavía no hay ofertas anteriores'
			: `Todavía no publicaste ofertas para ${dia === 'hoy' ? 'hoy' : 'mañana'}`;
	return (
		<div className="flex flex-col items-center gap-5 py-10">
			<HarturitoMessage title={title} className="max-w-[460px]">
				{dia === 'anteriores'
					? 'Acá vas a ver lo que publicaste los días pasados.'
					: 'Publicá lo que te sobra del día y te aviso cuando alguien reserve.'}
			</HarturitoMessage>
			{dia !== 'anteriores' && (
				<Button variant="brand" size="xl" asChild>
					<Link to="/ofertas/nueva">
						<Plus /> Nueva oferta
					</Link>
				</Button>
			)}
		</div>
	);
}

function groupByDay(publicaciones: Publicacion[]) {
	const groups = new Map<string, Publicacion[]>();
	for (const p of publicaciones) {
		const list = groups.get(p.fecha_operativa) ?? [];
		list.push(p);
		groups.set(p.fecha_operativa, list);
	}
	return [...groups.entries()].map(([day, items]) => ({
		day,
		items: items.sort((a, b) => a.ventana_inicio_at.localeCompare(b.ventana_inicio_at))
	}));
}
