import { Check, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils';

export type BannerTone = 'info' | 'error' | 'success' | 'warning' | 'dark';

const tones: Record<BannerTone, { className: string; icon: LucideIcon }> = {
	info: { className: 'bg-info-background text-foreground [&>svg]:text-info', icon: Info },
	error: { className: 'bg-error-background text-error', icon: TriangleAlert },
	success: {
		className: 'bg-success-background text-foreground [&>svg]:text-success',
		icon: Check
	},
	warning: { className: 'bg-warning-background text-foreground', icon: TriangleAlert },
	dark: { className: 'bg-ink text-white', icon: Info }
};

/** Full-width message strip ("Las reservas cierran a las 5:45 p. m."). */
export function Banner({
	tone = 'info',
	icon,
	children,
	className,
	role
}: {
	tone?: BannerTone;
	icon?: LucideIcon;
	children: ReactNode;
	className?: string;
	role?: 'status' | 'alert';
}) {
	const Icon = icon ?? tones[tone].icon;
	return (
		<div
			role={role ?? (tone === 'error' ? 'alert' : 'status')}
			className={cn(
				'flex items-start gap-3 rounded-xl px-4 py-3 text-sm leading-5 font-bold md:text-base md:leading-6',
				tones[tone].className,
				className
			)}
		>
			<Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden />
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}
