import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Store } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { comercioApi } from '@/features/comercio/api';
import { FichaPanel, HorarioPanel, PausaDialog, VentanasPanel } from '@/features/comercio/editar';
import { resumenHorario, resumenVentanas } from '@/features/comercio/horario';
import {
	comercioKeys,
	horariosQuery,
	pausasQuery,
	useComercio,
	ventanasQuery
} from '@/features/comercio/session';
import { usePendientesHoy } from '@/features/reservas/queries';
import { unwrapOrThrow } from '@/shared/models/result/result';
import { Banner } from '@/shared/ui/hz/banner';
import { Muted, Panel, PanelTitle } from '@/shared/ui/hz/panel';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { formatMoment } from '@/shared/utils/dates';

export const Route = createFileRoute('/_app/negocio')({
	component: MiNegocioPage
});

type Editing = 'ficha' | 'horario' | 'ventanas' | 'pausa' | null;

/** Screen 25: what people see of the business and when they pick up. */
function MiNegocioPage() {
	const { comercio } = useComercio();
	const [editing, setEditing] = useState<Editing>(null);
	const pendientes = usePendientesHoy();

	usePageInformation({
		title: 'Mi negocio',
		description: 'Lo que la gente ve de tu local y cuándo se retira.'
	});

	const horarios = useQuery(horariosQuery(comercio.id));
	const ventanas = useQuery(ventanasQuery(comercio.id));
	const pausas = useQuery(pausasQuery(comercio.id));
	const fotos = useQuery({
		queryKey: [...comercioKeys.detail(comercio.id), 'fotos'],
		queryFn: () => unwrapOrThrow(comercioApi.fotos(comercio.id))
	});

	const now = new Date();
	const pausaActiva = pausas.data?.find(
		p =>
			!p.finalizada_at &&
			new Date(p.inicio_at) <= now &&
			(!p.fin_at || new Date(p.fin_at) > now)
	);
	const close = (open: boolean) => !open && setEditing(null);
	const horario = horarios.data ? resumenHorario(horarios.data) : null;
	const retiros = ventanas.data ? resumenVentanas(ventanas.data) : [];

	return (
		<>
			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
				<Panel>
					<PanelTitle>Ficha en la app</PanelTitle>
					<div className="flex items-center gap-3">
						<span className="flex size-[60px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong bg-surface-soft">
							<Store className="size-6" aria-hidden />
						</span>
						<div className="min-w-0">
							<p className="truncate text-xl leading-7 font-bold">
								{comercio.nombre_comercial}
							</p>
							<Muted>{comercio.categoria_comida.etiqueta}</Muted>
						</div>
					</div>
					<dl className="flex flex-col gap-3">
						<FichaRow label="Descripción">
							{comercio.descripcion || 'Falta agregarla. Hasta 300 caracteres.'}
						</FichaRow>
						<FichaRow label="Cómo llegar">
							{comercio.referencias_llegada ||
								'Falta agregarlo. Hasta 150 caracteres.'}
						</FichaRow>
						<FichaRow label="Teléfono para clientes">
							{comercio.telefono_publico || 'Opcional'}
						</FichaRow>
						<FichaRow label="Fotos del local">
							{fotos.data?.length ? `${fotos.data.length} de 5` : 'Hasta 5'}
						</FichaRow>
					</dl>
					<Button
						variant="soft"
						size="xl"
						className="w-fit"
						onClick={() => setEditing('ficha')}
					>
						Cambiar ficha
					</Button>
					<p className="text-[13px] leading-[18px] font-medium text-muted-foreground">
						El nombre, la categoría y la dirección los revisa Hartazone antes de
						cambiarlos en la app.
					</p>
				</Panel>

				<div className="flex flex-col gap-6">
					<Panel>
						<PanelTitle
							action={
								<Button
									variant="plain"
									size="xl"
									className="px-3"
									onClick={() => setEditing('horario')}
								>
									Cambiar
								</Button>
							}
						>
							Horario de atención
						</PanelTitle>
						{horarios.isPending ? (
							<Skeleton className="h-6 w-3/4" />
						) : (
							<p className="text-lg leading-[26px] font-medium">
								{horario ?? 'Todavía no está configurado'}
							</p>
						)}
						<Muted className="text-[13px] leading-[18px]">
							Ningún retiro puede quedar fuera de este horario.
						</Muted>
					</Panel>
					<Panel>
						<PanelTitle
							action={
								<Button
									variant="plain"
									size="xl"
									className="px-3"
									onClick={() => setEditing('ventanas')}
								>
									{retiros.length ? 'Cambiar' : 'Agregar'}
								</Button>
							}
						>
							Horario de retiro
						</PanelTitle>
						{ventanas.isPending ? (
							<Skeleton className="h-6 w-2/3" />
						) : retiros.length ? (
							retiros.map(r => (
								<p key={r} className="text-lg leading-[26px] font-medium">
									{r}
								</p>
							))
						) : (
							<p className="text-lg leading-[26px] font-medium">
								Todavía no hay horarios de retiro
							</p>
						)}
						<Muted className="text-[13px] leading-[18px]">
							Se usa en cada oferta nueva. Las reservas cierran 15 minutos antes de
							que termine.
						</Muted>
					</Panel>
				</div>
			</div>

			{pausaActiva ? (
				<Banner tone="warning">
					Tu negocio está pausado
					{pausaActiva.fin_at
						? ` hasta ${formatMoment(pausaActiva.fin_at).toLowerCase()}`
						: ''}
					. No aparece en la app y no entran reservas nuevas.
				</Banner>
			) : (
				<section className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-soft p-5">
					<div className="flex min-w-0 flex-1 basis-80 flex-col gap-1">
						<h2 className="text-lg leading-[26px] font-bold">Pausar el negocio</h2>
						<p className="text-sm leading-5">
							Tu negocio deja de verse en la app y no entran reservas nuevas.{' '}
							{pendientes > 0
								? `Antes hay que entregar o cancelar las reservas pendientes: ahora tenés ${pendientes}.`
								: 'No tenés reservas pendientes, así que podés pausarlo ahora.'}
						</p>
					</div>
					{pendientes > 0 && (
						<Button variant="plain" size="xl" asChild>
							<Link to="/reservas">
								Ver{' '}
								{pendientes === 1 ? 'la pendiente' : `las ${pendientes} pendientes`}
							</Link>
						</Button>
					)}
					<Button
						variant="soft"
						size="md"
						className="border-brand bg-warning-background"
						disabled={pendientes > 0}
						onClick={() => setEditing('pausa')}
					>
						Pausar negocio
					</Button>
				</section>
			)}

			{editing === 'ficha' && <FichaPanel comercio={comercio} open onOpenChange={close} />}
			<HorarioPanel
				comercioId={comercio.id}
				open={editing === 'horario'}
				onOpenChange={close}
			/>
			<VentanasPanel
				comercioId={comercio.id}
				open={editing === 'ventanas'}
				onOpenChange={close}
			/>
			<PausaDialog comercioId={comercio.id} open={editing === 'pausa'} onOpenChange={close} />
		</>
	);
}

function FichaRow({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-6">
			<dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
			<dd className="text-right text-sm font-medium">{children}</dd>
		</div>
	);
}
