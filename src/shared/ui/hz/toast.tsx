import { Check } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Minimal toast from the design: a dark pill at the bottom center with a
 * yellow check ("Oferta publicada. Ya se ve en la app."). One at a time.
 */
type ToastState = { id: number; message: string } | null;

let state: ToastState = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function toast(message: string) {
	state = { id: Date.now(), message };
	emit();
}

function dismiss(id: number) {
	if (state?.id === id) {
		state = null;
		emit();
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Renders the current toast. Mount once, near the root. */
export function Toaster() {
	const current = useSyncExternalStore(subscribe, () => state);

	useEffect(() => {
		if (!current) return;
		const id = window.setTimeout(() => dismiss(current.id), 4500);
		return () => window.clearTimeout(id);
	}, [current]);

	return (
		<div
			aria-live="polite"
			className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
		>
			{current && (
				<div
					key={current.id}
					className="pointer-events-auto flex animate-in items-center gap-3 rounded-xl bg-ink py-3 pr-5 pl-3 text-base font-medium text-white shadow-xl fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"
				>
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-primary-foreground">
						<Check className="size-4 stroke-3" aria-hidden />
					</span>
					{current.message}
				</div>
			)}
		</div>
	);
}
