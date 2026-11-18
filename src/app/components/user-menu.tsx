import { useNavigate } from '@tanstack/react-router';
import { ChevronsUpDown, LogOut, Settings, User } from 'lucide-react';

import { useCurrentUser, useLogout } from '@/features/auth/session';
import { roleLabel, useComercio } from '@/features/comercio/session';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/shared/ui/primitives/dropdown-menu';

/** User card at the bottom of the sidebar: name, role in the business and account menu. */
export function UserMenu() {
	const user = useCurrentUser();
	const { membership } = useComercio();
	const logout = useLogout();
	const navigate = useNavigate();

	if (!user) return null;
	const fullName = `${user.first_name} ${user.last_name}`.trim() || user.email;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Menú de la cuenta"
					className="flex w-full items-center gap-2.5 rounded-xl bg-background p-3 text-left outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-soft">
						<User className="size-5" aria-hidden />
					</span>
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-sm leading-5 font-bold">{fullName}</span>
						<span className="truncate text-[13px] leading-[18px] font-medium tracking-[0.01em] text-muted-foreground">
							{roleLabel(membership)}
						</span>
					</span>
					<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="top" className="w-60">
				<DropdownMenuLabel className="flex flex-col">
					<span className="truncate">{fullName}</span>
					<span className="truncate text-xs font-normal text-muted-foreground">
						{user.email}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => navigate({ to: '/settings' })}>
					<Settings /> Preferencias
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() =>
						logout.mutate(undefined, { onSettled: () => navigate({ to: '/login' }) })
					}
				>
					<LogOut /> Cerrar sesión
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
