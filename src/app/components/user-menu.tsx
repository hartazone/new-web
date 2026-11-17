import { useNavigate } from '@tanstack/react-router';
import { LogOut, Settings } from 'lucide-react';

import { useCurrentUser, useLogout } from '@/features/auth/session';
import { Avatar, AvatarFallback } from '@/shared/ui/primitives/avatar';
import { Button } from '@/shared/ui/primitives/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/shared/ui/primitives/dropdown-menu';

const initials = (name: string) =>
	name
		.split(/\s+/)
		.map(part => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();

export function UserMenu() {
	const user = useCurrentUser();
	const logout = useLogout();
	const navigate = useNavigate();

	if (!user) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="rounded-full"
					aria-label="Account menu"
				>
					<Avatar className="size-8">
						{/*{user. && <AvatarImage src={user.avatar_url} alt="" />}*/}
						<AvatarFallback>{initials(user.first_name)}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col">
					<span className="truncate">{user.first_name}</span>
					<span className="truncate text-xs font-normal text-muted-foreground">
						{user.email}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => navigate({ to: '/settings' })}>
					<Settings /> Settings
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() =>
						logout.mutate(undefined, { onSettled: () => navigate({ to: '/login' }) })
					}
				>
					<LogOut /> Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
