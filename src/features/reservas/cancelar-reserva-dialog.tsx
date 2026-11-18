import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { motivosQuery } from '@/features/catalogos/queries';
import { describeError } from '@/shared/models/app-error/describe-error';
import { Banner } from '@/shared/ui/hz/banner';
import { DialogActions, StickerDialog } from '@/shared/ui/hz/sticker-dialog';
import { toast } from '@/shared/ui/hz/toast';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { Spinner } from '@/shared/ui/primitives/spinner';
import { cn } from '@/shared/utils';
import { firstName } from '@/shared/utils/dates';

import type { Reserva } from './api';
import { clienteNombre } from './model';
import { useCancelarReserva } from './queries';

/**
 * Screen 24: the business cancels a live reservation choosing a reason
 * (CU-C-29). The units go back to the offer and the customer is notified.
 */
export function CancelarReservaDialog({
	reserva,
	open,
	onOpenChange,
	onCancelled
}: {
	reserva: Reserva;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCancelled?: () => void;
}) {
	const {
		data: motivos,
		isPending,
		isError,
		refetch
	} = useQuery({
		...motivosQuery('cancelacion_comercio'),
		enabled: open
	});
	const cancelar = useCancelarReserva();
	const [motivoId, setMotivoId] = useState<string | null>(null);

	// `CancelarReservaPost` has no field for the note, so reasons that require
	// one cannot be sent from here yet.
	const opciones = (motivos ?? []).filter(m => !m.require_nota);
	const selected = motivoId ?? opciones[0]?.id ?? null;
	const nombre = clienteNombre(reserva);
	const unidades =
		reserva.cantidad === 1 ? 'la unidad vuelve' : `las ${reserva.cantidad} unidades vuelven`;

	return (
		<StickerDialog
			open={open}
			onOpenChange={next => {
				onOpenChange(next);
				if (!next) cancelar.reset();
			}}
			title={
				nombre === 'Cliente' ? 'Cancelar esta reserva' : `Cancelar la reserva de ${nombre}`
			}
			description={`Le avisamos a ${
				nombre === 'Cliente' ? 'la persona' : firstName(nombre)
			} y ${unidades} a quedar disponibles. Las cancelaciones del negocio cuentan en tus indicadores.`}
			className="max-w-[560px]"
		>
			<fieldset className="flex flex-col gap-1">
				<legend className="mb-2 text-sm leading-5 font-bold">¿Por qué la cancelás?</legend>
				{isPending ? (
					<div className="flex flex-col gap-2">
						{[0, 1, 2].map(i => (
							<Skeleton key={i} className="h-10 rounded-lg" />
						))}
					</div>
				) : isError ? (
					<div className="flex items-center gap-3">
						<Banner tone="error" className="flex-1">
							No pudimos traer los motivos.
						</Banner>
						<Button variant="soft" size="md" onClick={() => refetch()}>
							Reintentar
						</Button>
					</div>
				) : (
					opciones.map(m => (
						<label
							key={m.id}
							className={cn(
								'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-4 text-base has-focus-visible:ring-2 has-focus-visible:ring-ring',
								selected === m.id ? 'bg-selection font-bold' : 'hover:bg-secondary'
							)}
						>
							<input
								type="radio"
								name="motivo-cancelacion"
								value={m.id}
								checked={selected === m.id}
								onChange={() => setMotivoId(m.id)}
								className="size-5 accent-[var(--border-strong)]"
							/>
							{m.etiqueta}
						</label>
					))
				)}
			</fieldset>

			{cancelar.isError && <Banner tone="error">{describeError(cancelar.error)}</Banner>}

			<DialogActions>
				<Button
					variant="accent"
					size="md"
					disabled={!selected || cancelar.isPending}
					onClick={() =>
						selected &&
						cancelar.mutate(
							{ reservaId: reserva.id, motivoId: selected },
							{
								onSuccess: () => {
									toast('Reserva cancelada. Le avisamos al cliente.');
									onOpenChange(false);
									onCancelled?.();
								}
							}
						)
					}
				>
					{cancelar.isPending && <Spinner />}
					Cancelar reserva
				</Button>
				<Button variant="soft" size="md" onClick={() => onOpenChange(false)}>
					Volver
				</Button>
			</DialogActions>
		</StickerDialog>
	);
}
