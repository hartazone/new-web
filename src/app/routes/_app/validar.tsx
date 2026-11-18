import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ScanQrCode, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { useCurrentUser } from '@/features/auth/session';
import { useComercio } from '@/features/comercio/session';
import {
	reservasApi,
	type Reserva,
	type ValidacionEntregada,
	type ValidarReservaPost
} from '@/features/reservas/api';
import {
	clienteNombre,
	CODIGO_LENGTH,
	formatCodigo,
	grupoDe,
	normalizeCodigo,
	reservaLabel
} from '@/features/reservas/model';
import { reservaKeys, reservasDelDiaQuery, useValidarReserva } from '@/features/reservas/queries';
import { ReservaTicket } from '@/features/reservas/reserva-ticket';
import { CobrarCard } from '@/features/validar/cobrar-card';
import { CodigoInput } from '@/features/validar/codigo-input';
import { encolarValidacion, useSincronizarValidaciones } from '@/features/validar/offline';
import { QrScanner } from '@/features/validar/qr-scanner';
import { describeError } from '@/shared/models/app-error/describe-error';
import { Banner } from '@/shared/ui/hz/banner';
import { DetailList, DetailRow } from '@/shared/ui/hz/detail-list';
import { HarturitoMessage } from '@/shared/ui/hz/harturito';
import { Panel, PanelTitle } from '@/shared/ui/hz/panel';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { Button } from '@/shared/ui/primitives/button';
import { Spinner } from '@/shared/ui/primitives/spinner';
import { cn } from '@/shared/utils';
import {
	formatLongDate,
	formatMoment,
	formatMoney,
	formatTime,
	isoDate
} from '@/shared/utils/dates';

export const Route = createFileRoute('/_app/validar')({
	validateSearch: z.object({
		/** Prefilled from a reservation ("Validar entrega" in its panel). */
		codigo: z.string().optional().catch(undefined)
	}),
	component: ValidarPage
});

type Metodo = NonNullable<ValidarReservaPost['metodo']>;

type Problema =
	| { kind: 'no_existe'; codigo: string }
	| { kind: 'ya_entregada'; reserva: Reserva }
	| { kind: 'cancelada'; reserva: Reserva }
	| { kind: 'fuera_de_horario'; reserva: Reserva }
	| { kind: 'todavia_no'; reserva: Reserva }
	| { kind: 'error'; message: string };

type Step =
	| { kind: 'buscar' }
	| { kind: 'cobrar'; reserva: Reserva; metodo: Metodo }
	| {
			kind: 'confirmada';
			reserva: Reserva;
			body: ValidarReservaPost;
			validacion: ValidacionEntregada | null;
	  };

/** Decides what the operator can do with the reservation behind a code (CU-C-31 2a–2d). */
function evaluar(reserva: Reserva | null, codigo: string, now = new Date()): Problema | null {
	if (!reserva) return { kind: 'no_existe', codigo };
	const grupo = grupoDe(reserva);
	if (grupo === 'entregada') return { kind: 'ya_entregada', reserva };
	if (grupo === 'cancelada') return { kind: 'cancelada', reserva };
	if (grupo === 'no_retirada' || now > new Date(reserva.validacion_hasta_at))
		return { kind: 'fuera_de_horario', reserva };
	if (now < new Date(reserva.ventana_inicio_at)) return { kind: 'todavia_no', reserva };
	if (!reserva.estado.allow_validacion)
		return {
			kind: 'error',
			message: `Esta reserva está ${reserva.estado.etiqueta.toLowerCase()} y todavía no se puede entregar.`
		};
	return null;
}

/** Screens 14–20, 28 and 30: validate a pickup code, collect the cash and confirm. */
function ValidarPage() {
	const { codigo: codigoInicial } = Route.useSearch();
	const { comercio } = useComercio();
	const user = useCurrentUser();
	const validar = useValidarReserva();
	const { online, pendientes, conflictos, dismissConflictos } = useSincronizarValidaciones();

	const [codigo, setCodigo] = useState(() => normalizeCodigo(codigoInicial ?? ''));
	const [step, setStep] = useState<Step>({ kind: 'buscar' });
	const [problema, setProblema] = useState<Problema | null>(null);
	const [buscando, setBuscando] = useState(false);
	const [cameraOk, setCameraOk] = useState(true);
	const searchedInitial = useRef(false);

	usePageInformation({
		title: 'Validar entrega',
		description:
			step.kind === 'cobrar'
				? 'Revisá la reserva, cobrá y confirmá.'
				: step.kind === 'confirmada'
					? 'Listo, podés seguir con la siguiente.'
					: problema?.kind === 'fuera_de_horario'
						? `${formatLongDate(new Date())}, ${formatTime(new Date())}`
						: cameraOk
							? 'Pedile el código al cliente o escaneá su QR.'
							: 'Pedile el código al cliente y escribilo.',
		pickupStatus: true
	});

	// Offline, codes are checked against today's reservations already on the device.
	const { data: delDia } = useQuery(reservasDelDiaQuery(comercio.id, isoDate()));

	const buscar = useCallback(
		async (value: string, metodo: Metodo = 'codigo_manual') => {
			const clean = normalizeCodigo(value);
			setCodigo(clean);
			setProblema(null);
			validar.reset();
			if (clean.length !== CODIGO_LENGTH) {
				setProblema({
					kind: 'error',
					message: `El código tiene ${CODIGO_LENGTH} caracteres. Llevás ${clean.length}.`
				});
				return;
			}
			setBuscando(true);
			let reserva: Reserva | null;
			if (navigator.onLine) {
				const result = await reservasApi.porCodigo(comercio.id, clean);
				setBuscando(false);
				if (result.isErr()) {
					setProblema({ kind: 'error', message: describeError(result.error) });
					return;
				}
				reserva = result.value;
			} else {
				setBuscando(false);
				reserva = delDia?.find(r => normalizeCodigo(r.codigo ?? '') === clean) ?? null;
			}
			const issue = evaluar(reserva, clean);
			if (issue || !reserva) setProblema(issue);
			else setStep({ kind: 'cobrar', reserva, metodo });
		},
		[comercio.id, delDia, validar]
	);

	useEffect(() => {
		if (searchedInitial.current || !codigoInicial) return;
		searchedInitial.current = true;
		void buscar(codigoInicial);
	}, [codigoInicial, buscar]);

	const onScan = useCallback((value: string) => void buscar(value, 'qr'), [buscar]);

	const confirmar = (reserva: Reserva, body: ValidarReservaPost) => {
		if (!navigator.onLine) {
			encolarValidacion(body, reserva.id);
			setStep({ kind: 'confirmada', reserva, body, validacion: null });
			return;
		}
		validar.mutate(body, {
			onSuccess: validacion => setStep({ kind: 'confirmada', reserva, body, validacion })
		});
	};

	const reiniciar = () => {
		setStep({ kind: 'buscar' });
		setProblema(null);
		setCodigo('');
		validar.reset();
	};

	const errorId = 'codigo-error';

	return (
		<>
			{!online && (
				<Banner tone="dark" icon={WifiOff}>
					Sin conexión. Podés seguir validando con las reservas de hoy; se guarda al
					volver la señal.
				</Banner>
			)}
			{online && pendientes.length > 0 && (
				<Banner tone="info">
					Guardando {pendientes.length}{' '}
					{pendientes.length === 1 ? 'entrega validada' : 'entregas validadas'} sin
					conexión…
				</Banner>
			)}
			{conflictos.length > 0 && (
				<Banner tone="error">
					{conflictos.map(c => (
						<p key={c.codigo}>
							La entrega {formatCodigo(c.codigo)} no se pudo registrar: {c.mensaje}
						</p>
					))}
					<button type="button" className="mt-1 underline" onClick={dismissConflictos}>
						Entendido
					</button>
				</Banner>
			)}

			{step.kind === 'cobrar' ? (
				<CobrarCard
					key={step.reserva.id}
					reserva={step.reserva}
					metodo={step.metodo}
					pending={validar.isPending}
					error={validar.error}
					onConfirm={body => confirmar(step.reserva, body)}
					onBack={reiniciar}
				/>
			) : step.kind === 'confirmada' ? (
				<Confirmada
					step={step}
					operador={
						step.validacion?.operador ||
						`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
					}
					restantes={(delDia ?? []).filter(
						r => grupoDe(r) === 'por_retirar' && r.id !== step.reserva.id
					)}
					onNext={reiniciar}
				/>
			) : (
				<>
					<div className="grid items-start gap-6 md:grid-cols-2">
						<Panel className="order-2 md:order-1">
							<PanelTitle as="h2">Escanear el QR</PanelTitle>
							<QrScanner
								onCode={onScan}
								paused={buscando}
								onAvailabilityChange={setCameraOk}
							/>
							<p className="text-[13px] leading-[18px] text-muted-foreground">
								La cámara solo se usa para leer el código.
							</p>
						</Panel>
						<Panel className="order-1 md:order-2">
							<PanelTitle as="h2">Escribir el código</PanelTitle>
							<form
								noValidate
								className="flex flex-col gap-4"
								onSubmit={e => {
									e.preventDefault();
									void buscar(codigo);
								}}
							>
								<CodigoInput
									value={codigo}
									onChange={next => {
										setCodigo(next);
										if (
											problema?.kind === 'no_existe' ||
											problema?.kind === 'error'
										)
											setProblema(null);
									}}
									invalid={problema?.kind === 'no_existe'}
									describedBy={errorId}
								/>
								<p
									id={errorId}
									className={cn(
										'text-[13px] leading-[18px]',
										problema?.kind === 'no_existe' || problema?.kind === 'error'
											? 'text-error'
											: 'text-muted-foreground'
									)}
									role={problema ? 'alert' : undefined}
								>
									{problema?.kind === 'no_existe'
										? `No hay ninguna reserva con el código ${formatCodigo(problema.codigo)}. Revisá letra por letra con el cliente y probá de nuevo.`
										: problema?.kind === 'error'
											? problema.message
											: 'Son 6 caracteres. No importan las mayúsculas ni los espacios.'}
								</p>
								<Button
									type="submit"
									variant="brand"
									size="xl"
									className="h-[52px] w-full text-xl sm:w-fit"
									disabled={buscando}
								>
									{buscando && <Spinner />}
									Buscar reserva
								</Button>
							</form>
						</Panel>
					</div>
					<ProblemaCard problema={problema} onReset={reiniciar} />
				</>
			)}
		</>
	);
}

function ProblemaCard({ problema, onReset }: { problema: Problema | null; onReset: () => void }) {
	if (!problema || problema.kind === 'no_existe' || problema.kind === 'error') return null;
	const { reserva } = problema;

	if (problema.kind === 'ya_entregada') {
		return (
			<section className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-border-strong bg-warning-background p-5">
				<h2 className="text-xl leading-7 font-bold">Este código ya se entregó</h2>
				<p className="text-sm leading-5">
					{reserva.retirada_at
						? `Se validó ${formatMoment(reserva.retirada_at).toLowerCase().replace(',', ' a las')}. `
						: ''}
					Una reserva se entrega y se cobra una sola vez.
				</p>
				<ReservaTicket reserva={reserva} onOpen={() => undefined} />
				<Button variant="soft" size="md" className="w-fit" onClick={onReset}>
					Validar otro código
				</Button>
			</section>
		);
	}

	const tone =
		problema.kind === 'todavia_no'
			? 'border-border-strong bg-info-background'
			: 'border-error bg-error-background';
	const nombre = clienteNombre(reserva);
	const de = nombre === 'Cliente' ? 'Esta reserva' : `La reserva de ${nombre}`;
	const toleranciaMin = Math.round(
		(new Date(reserva.validacion_hasta_at).getTime() -
			new Date(reserva.ventana_fin_at).getTime()) /
			60_000
	);

	return (
		<section className={cn('flex flex-col gap-3 rounded-2xl border-[1.5px] p-5', tone)}>
			<h2 className="text-xl leading-7 font-bold">
				{problema.kind === 'cancelada'
					? 'Esta reserva está cancelada'
					: problema.kind === 'todavia_no'
						? 'El retiro todavía no empieza'
						: 'El horario de retiro ya terminó'}
			</h2>
			<p className="text-sm leading-5">
				{problema.kind === 'cancelada'
					? `${de} se canceló${reserva.cancelada_at ? ` ${formatMoment(reserva.cancelada_at).toLowerCase()}` : ''}. No hay nada que entregar ni cobrar.`
					: problema.kind === 'todavia_no'
						? `${de} se puede entregar desde las ${formatTime(reserva.ventana_inicio_at)}. Pedile al cliente que vuelva a esa hora.`
						: `${de} se podía retirar hasta las ${formatTime(reserva.ventana_fin_at)}${
								toleranciaMin > 0 ? `, con ${toleranciaMin} minutos extra` : ''
							}. Ya pasó ese plazo y quedó como no retirada. Solo el equipo de Hartazone puede autorizar esta entrega.`}
			</p>
			<div className="flex flex-wrap gap-3">
				{problema.kind !== 'todavia_no' && (
					<Button variant="soft" size="md" asChild>
						<Link to="/reservas" search={{ tab: 'canceladas', reserva: reserva.id }}>
							Ver la reserva
						</Link>
					</Button>
				)}
				<Button variant="soft" size="md" onClick={onReset}>
					Validar otro código
				</Button>
			</div>
		</section>
	);
}

function Confirmada({
	step,
	operador,
	restantes,
	onNext
}: {
	step: Extract<Step, { kind: 'confirmada' }>;
	operador: string;
	restantes: Reserva[];
	onNext: () => void;
}) {
	const { reserva, body, validacion } = step;
	const nombre = clienteNombre(reserva);
	const monto = validacion?.monto_cobrado ?? body.monto_cobrado ?? reserva.monto_total;
	const cantidad = validacion?.cantidad_entregada ?? body.cantidad_entregada ?? reserva.cantidad;
	const queryClient = useQueryClient();

	useEffect(() => {
		void queryClient.invalidateQueries({ queryKey: reservaKeys.all });
	}, [queryClient]);

	const hasta = restantes.length
		? restantes.reduce(
				(max, r) => (r.ventana_fin_at > max ? r.ventana_fin_at : max),
				restantes[0].ventana_fin_at
			)
		: null;

	return (
		<>
			<Banner tone={validacion ? 'success' : 'warning'}>
				{validacion
					? `Entrega confirmada. Cobraste ${formatMoney(monto)} en efectivo${nombre === 'Cliente' ? '' : ` a ${nombre}`}.`
					: `Entrega guardada en este dispositivo. Se registra apenas vuelva la conexión.`}
			</Banner>
			<div className="grid items-start gap-6 md:grid-cols-2">
				<Panel>
					<PanelTitle as="h2">Lo que quedó registrado</PanelTitle>
					<DetailList className="border-0 p-0">
						<DetailRow label="Código">{formatCodigo(reserva.codigo)}</DetailRow>
						<DetailRow label="Cliente">{nombre}</DetailRow>
						<DetailRow label="Entregado">{reservaLabel(reserva, cantidad)}</DetailRow>
						<DetailRow label="Cobrado">{formatMoney(monto)} en efectivo</DetailRow>
						<DetailRow label="Validó">
							{operador || 'Vos'},{' '}
							{formatMoment(validacion?.validada_at ?? new Date()).toLowerCase()}
						</DetailRow>
					</DetailList>
				</Panel>
				<div className="flex flex-col gap-4">
					<HarturitoMessage
						title={
							restantes.length
								? `Quedan ${restantes.length} ${restantes.length === 1 ? 'reserva' : 'reservas'} por retirar`
								: 'No queda nadie por retirar'
						}
					>
						{hasta
							? `Tienen hasta las ${formatTime(hasta)}. Yo te aviso si alguna no llega.`
							: 'Ya entregaste todo lo reservado para hoy.'}
					</HarturitoMessage>
					<div className="flex flex-wrap gap-3">
						<Button variant="brand" size="xl" onClick={onNext}>
							<ScanQrCode /> Validar otra entrega
						</Button>
						<Button variant="soft" size="xl" asChild>
							<Link to="/dashboard">Ir a Inicio</Link>
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}
