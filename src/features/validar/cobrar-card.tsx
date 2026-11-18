import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { motivosQuery } from '@/features/catalogos/queries';
import type { Reserva, ValidarReservaPost } from '@/features/reservas/api';
import { clienteNombre, estadoReserva, reservaLabel } from '@/features/reservas/model';
import { CodigoBlock } from '@/features/reservas/reserva-ticket';
import { describeError } from '@/shared/models/app-error/describe-error';
import { Banner } from '@/shared/ui/hz/banner';
import { Chip } from '@/shared/ui/hz/chip';
import { QuantityStepper } from '@/shared/ui/hz/quantity-stepper';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Spinner } from '@/shared/ui/primitives/spinner';
import { cn } from '@/shared/utils';
import { formatMoney, parseMoney } from '@/shared/utils/dates';

/**
 * Screen 15: review the reservation, collect the exact cash and confirm.
 * Fewer units need a reason (CU-C-32); a different amount needs a note
 * (CU-C-31 3a).
 */
export function CobrarCard({
	reserva,
	metodo,
	pending,
	error,
	onConfirm,
	onBack
}: {
	reserva: Reserva;
	metodo: ValidarReservaPost['metodo'];
	pending: boolean;
	error: unknown;
	onConfirm: (body: ValidarReservaPost) => void;
	onBack: () => void;
}) {
	const ids = useId();
	const [unidades, setUnidades] = useState(reserva.cantidad);
	const precioUnitario = Number(reserva.precio_unitario);
	const esperado =
		unidades === reserva.cantidad ? Number(reserva.monto_total) : precioUnitario * unidades;
	const [monto, setMonto] = useState(esperado.toFixed(2));
	const [montoTocado, setMontoTocado] = useState(false);
	const [motivoId, setMotivoId] = useState('');
	const [nota, setNota] = useState('');
	const [submitted, setSubmitted] = useState(false);

	const parcial = unidades < reserva.cantidad;
	const { data: motivos = [] } = useQuery({
		...motivosQuery('entrega_parcial'),
		enabled: parcial
	});

	const cobrado = parseMoney(monto);
	const montoDistinto = Number.isFinite(cobrado) && Math.abs(cobrado - esperado) >= 0.005;
	const motivo = motivos.find(m => m.id === motivoId);
	const errors = {
		monto: !Number.isFinite(cobrado) ? 'Escribí el monto que recibiste.' : undefined,
		motivo: parcial && !motivoId ? 'Elegí por qué entregás menos unidades.' : undefined,
		nota:
			(montoDistinto || motivo?.require_nota) && !nota.trim()
				? montoDistinto
					? 'Escribí por qué cobraste otro monto.'
					: 'Este motivo necesita una nota.'
				: undefined
	};
	const show = (e?: string) => (submitted ? e : undefined);

	const changeUnits = (n: number) => {
		setUnidades(n);
		// Keep the amount in sync with the units unless the operator typed one.
		if (!montoTocado) {
			const next = n === reserva.cantidad ? Number(reserva.monto_total) : precioUnitario * n;
			setMonto(next.toFixed(2));
		}
	};

	const confirm = () => {
		setSubmitted(true);
		if (Object.values(errors).some(Boolean)) return;
		onConfirm({
			codigo: reserva.codigo ?? '',
			metodo,
			cantidad_entregada: unidades,
			monto_cobrado: cobrado.toFixed(2),
			motivo_parcial_id: parcial ? motivoId : null,
			nota: nota.trim()
		});
	};

	const estado = estadoReserva(reserva);

	return (
		<section className="w-full max-w-[632px] overflow-hidden rounded-2xl border-[1.5px] border-border-strong bg-card shadow-sticker">
			<div className="flex items-start justify-between gap-3 bg-brand">
				<CodigoBlock
					codigo={reserva.codigo}
					size="lg"
					className="border-0 bg-transparent"
				/>
				<Chip tone="warning" icon={estado.icon} className="m-4 bg-background">
					{estado.label}
				</Chip>
			</div>
			<div className="flex flex-col gap-5 p-5 md:p-6">
				<div>
					<p className="font-serif text-2xl leading-8">{clienteNombre(reserva)}</p>
					<p className="text-base leading-6 font-medium">
						{reservaLabel(reserva, unidades)}
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col">
						<span className="text-sm text-muted-foreground">Cobrá en efectivo</span>
						<span className="text-[40px] leading-[48px] font-bold tracking-[-0.02em] md:text-[48px] md:leading-[56px]">
							{formatMoney(esperado)}
						</span>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor={`${ids}-monto`} className="text-sm leading-5 font-bold">
							Monto recibido
						</label>
						<div className="relative">
							<span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
								C$
							</span>
							<Input
								id={`${ids}-monto`}
								inputMode="decimal"
								value={monto}
								aria-invalid={!!show(errors.monto) || undefined}
								aria-describedby={`${ids}-monto-hint`}
								onChange={e => {
									setMontoTocado(true);
									setMonto(e.target.value.replace(/[^\d.]/g, ''));
								}}
								className="pl-11"
							/>
						</div>
						<p
							id={`${ids}-monto-hint`}
							className={cn(
								'text-[13px] leading-[18px]',
								show(errors.monto) ? 'text-error' : 'text-muted-foreground'
							)}
						>
							{show(errors.monto) ??
								'Si cobraste otro monto, cambialo y escribí por qué.'}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-4">
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="text-base leading-6 font-bold">Unidades que entregás</span>
						<span className="text-sm leading-5 text-muted-foreground">
							{reserva.cantidad > 1
								? `Si entregás menos de ${reserva.cantidad}, elegí el motivo.`
								: 'La reserva es de 1 unidad.'}
						</span>
					</div>
					<QuantityStepper
						label="Unidades que entregás"
						value={unidades}
						min={1}
						max={reserva.cantidad}
						onChange={changeUnits}
					/>
				</div>

				{parcial && (
					<div className="flex flex-col gap-2">
						<label htmlFor={`${ids}-motivo`} className="text-sm leading-5 font-bold">
							¿Por qué entregás menos?
						</label>
						<div className="relative">
							<select
								id={`${ids}-motivo`}
								value={motivoId}
								aria-invalid={!!show(errors.motivo) || undefined}
								onChange={e => setMotivoId(e.target.value)}
								className="h-12 w-full appearance-none rounded-xl border-[1.5px] border-input bg-card pr-11 pl-4 text-base outline-none focus-visible:border-border-strong focus-visible:ring-3 focus-visible:ring-selection aria-invalid:border-error"
							>
								<option value="">Elegí un motivo</option>
								{motivos.map(m => (
									<option key={m.id} value={m.id}>
										{m.etiqueta}
									</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
						</div>
						{show(errors.motivo) && (
							<p className="text-[13px] text-error">{errors.motivo}</p>
						)}
						<p className="text-[13px] leading-[18px] text-muted-foreground">
							Las unidades que no se entregan no vuelven a estar disponibles.
						</p>
					</div>
				)}

				{(montoDistinto || motivo?.require_nota) && (
					<div className="flex flex-col gap-2">
						<label htmlFor={`${ids}-nota`} className="text-sm leading-5 font-bold">
							Nota
						</label>
						<textarea
							id={`${ids}-nota`}
							value={nota}
							rows={2}
							maxLength={500}
							aria-invalid={!!show(errors.nota) || undefined}
							onChange={e => setNota(e.target.value)}
							placeholder={
								montoDistinto
									? 'Por ejemplo: el cliente pagó con billete y no tenía cambio.'
									: ''
							}
							className="w-full rounded-xl border-[1.5px] border-input bg-card px-4 py-3 text-base outline-none focus-visible:border-border-strong focus-visible:ring-3 focus-visible:ring-selection aria-invalid:border-error"
						/>
						{show(errors.nota) && (
							<p className="text-[13px] text-error">{errors.nota}</p>
						)}
					</div>
				)}

				<Banner className="font-medium">
					Al confirmar, la reserva queda retirada y cobrada. No se puede deshacer.
				</Banner>
				{!!error && <Banner tone="error">{describeError(error)}</Banner>}

				<div className="flex flex-wrap gap-3">
					<Button
						variant="brand"
						size="xl"
						className="h-[52px] text-xl"
						disabled={pending}
						onClick={confirm}
					>
						{pending && <Spinner />}
						Confirmar cobro y entrega
					</Button>
					<Button variant="soft" size="md" className="h-[52px]" onClick={onBack}>
						Volver
					</Button>
				</div>
			</div>
		</section>
	);
}
