import { Bell, Check, Store } from 'lucide-react';

import { PickupStatusPill } from '@/features/comercio/pickup-status';
import { useComercio } from '@/features/comercio/session';
import { usePageContext } from '@/shared/ui/layout/page-context';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/shared/ui/primitives/dropdown-menu';

const pill =
	'inline-flex h-10 items-center gap-2.5 rounded-full border-[1.5px] border-border-strong bg-background text-sm leading-5 font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-12';

/** Right side of the page header: pickup status, current business and notices. */
export function HeaderActions() {
	const page = usePageContext();
	return (
		<>
			{page?.pickupStatus && <PickupStatusPill />}
			<ComercioMenu />
			<NoticesButton />
		</>
	);
}

/** Business pill. People who belong to several businesses switch here (CU-C-05). */
function ComercioMenu() {
	const { comercio, comercios, selectComercio } = useComercio();

	const content = (
		<>
			<Store className="size-5 shrink-0" aria-hidden />
			<span className="max-w-[16rem] truncate">{comercio.nombre_comercial}</span>
		</>
	);

	if (comercios.length < 2) {
		return <span className={`${pill} pr-4 pl-3`}>{content}</span>;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className={`${pill} pr-4 pl-3 hover:bg-secondary`}>
				{content}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				<DropdownMenuLabel>Operar como</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{comercios.map(c => (
					<DropdownMenuItem key={c.id} onSelect={() => selectComercio(c.id)}>
						<Store />
						<span className="flex-1 truncate">{c.nombre_comercial}</span>
						{c.id === comercio.id && <Check className="text-success" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NoticesButton() {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Avisos"
				className={`${pill} w-10 justify-center hover:bg-secondary md:w-12`}
			>
				<Bell className="size-[22px]" aria-hidden />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72 p-4">
				<p className="text-base font-bold">Avisos</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Te avisamos por correo y en el teléfono cada vez que alguien reserva o cancela.
				</p>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
