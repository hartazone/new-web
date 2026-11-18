import { Ban, ScanQrCode } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CODIGO_LENGTH, normalizeCodigo } from '@/features/reservas/model';
import { Button } from '@/shared/ui/primitives/button';
import { cn } from '@/shared/utils';

type BarcodeDetectorLike = {
	detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};
declare global {
	interface Window {
		BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
	}
}

type ScannerState = 'idle' | 'starting' | 'scanning' | 'unavailable';

/** Pulls a pickup code out of whatever the customer's QR holds (the bare code or a link). */
export function codigoFromQr(raw: string): string | null {
	const candidates = raw.toUpperCase().match(/[0-9A-Z]{6}/g) ?? [];
	const last = candidates.reverse().find(c => normalizeCodigo(c).length === CODIGO_LENGTH);
	return last ? normalizeCodigo(last) : null;
}

/**
 * Camera reader for the customer's QR (CU-C-31). Uses the browser's
 * BarcodeDetector; where it or the camera is not available it explains why
 * and the operator types the code instead (screen 20).
 */
export function QrScanner({
	onCode,
	onAvailabilityChange,
	paused,
	compact
}: {
	onCode: (codigo: string) => void;
	onAvailabilityChange?: (available: boolean) => void;
	/** Stops reading while a reservation is being reviewed. */
	paused?: boolean;
	compact?: boolean;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [state, setState] = useState<ScannerState>('idle');

	const stop = useCallback(() => {
		streamRef.current?.getTracks().forEach(t => t.stop());
		streamRef.current = null;
	}, []);

	const start = useCallback(async () => {
		if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
			setState('unavailable');
			onAvailabilityChange?.(false);
			return;
		}
		setState('starting');
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
				audio: false
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				await videoRef.current.play();
			}
			setState('scanning');
			onAvailabilityChange?.(true);
		} catch {
			stop();
			setState('unavailable');
			onAvailabilityChange?.(false);
		}
	}, [onAvailabilityChange, stop]);

	// Start on its own when the camera was already allowed; otherwise wait for a tap.
	useEffect(() => {
		let cancelled = false;
		navigator.permissions
			?.query({ name: 'camera' as PermissionName })
			.then(status => {
				if (!cancelled && status.state === 'granted') void start();
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
			stop();
		};
	}, [start, stop]);

	useEffect(() => {
		if (state !== 'scanning' || paused || !window.BarcodeDetector) return;
		const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
		let active = true;
		const tick = async () => {
			const video = videoRef.current;
			if (!active || !video) return;
			try {
				const codes = await detector.detect(video);
				const codigo = codes.map(c => codigoFromQr(c.rawValue)).find(Boolean);
				if (codigo) {
					onCode(codigo);
					return;
				}
			} catch {
				/* A frame that cannot be read: try the next one. */
			}
			if (active) window.setTimeout(tick, 250);
		};
		void tick();
		return () => {
			active = false;
		};
	}, [state, paused, onCode]);

	return (
		<div
			className={cn(
				'relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 text-center',
				compact ? 'h-[300px]' : 'h-[232px]',
				state === 'unavailable'
					? 'bg-neutral-background text-foreground'
					: 'bg-ink text-white'
			)}
		>
			<video
				ref={videoRef}
				muted
				playsInline
				aria-hidden
				className={cn(
					'absolute inset-0 size-full object-cover',
					state !== 'scanning' && 'hidden'
				)}
			/>
			{state === 'unavailable' ? (
				<>
					<Ban className="size-8 stroke-[2.5]" aria-hidden />
					<p className="text-base font-bold">No pudimos usar la cámara</p>
					<p className="max-w-[280px] text-[13px] leading-[18px] text-muted-foreground">
						Revisá el permiso de cámara del navegador o escribí el código aquí al lado.
					</p>
					<Button variant="soft" size="md" onClick={() => void start()}>
						Volver a intentar
					</Button>
				</>
			) : state === 'scanning' ? (
				<span className="relative mt-auto mb-4 rounded-full bg-ink/70 px-3 py-1 text-sm font-medium">
					Apuntá la cámara al código del cliente
				</span>
			) : (
				<button
					type="button"
					onClick={() => void start()}
					disabled={state === 'starting'}
					className="flex flex-col items-center gap-4 rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-brand"
				>
					<ScanQrCode className="size-11 stroke-[1.75]" aria-hidden />
					<span className="text-sm font-medium">
						{state === 'starting'
							? 'Abriendo la cámara…'
							: compact
								? 'Apuntá al código del cliente'
								: 'Apuntá la cámara al código del cliente'}
					</span>
					{state === 'idle' && (
						<span className="text-[13px] text-white/70">
							Tocá para activar la cámara
						</span>
					)}
				</button>
			)}
		</div>
	);
}
