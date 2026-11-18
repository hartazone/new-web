import { createFileRoute } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';
import { z } from 'zod';

import { useCurrentUser } from '@/features/auth/session';
import { usePageInformation } from '@/shared/ui/layout/page-context';
import { DataGrid, DataItem, SectionCard } from '@/shared/ui/layout/section-card';
import { TabPanel, Tabs } from '@/shared/ui/layout/tabs';
import { useTheme, type Theme } from '@/shared/ui/theme/theme-provider';
import { cn } from '@/shared/utils';

const TABS = ['profile', 'appearance'] as const;

/**
 * TABBED PAGE TEMPLATE
 * The active tab is a validated search param (`/settings?tab=appearance`), so
 * it is linkable and survives reloads.
 */
export const Route = createFileRoute('/_app/settings')({
	validateSearch: z.object({ tab: z.enum(TABS).default('profile').catch('profile') }),
	component: SettingsPage
});

function SettingsPage() {
	const { tab } = Route.useSearch();
	const navigate = Route.useNavigate();

	usePageInformation({ title: 'Preferencias', description: 'Tu cuenta y cómo se ve el portal.' });

	return (
		<>
			<div className="flex flex-col gap-6">
				<Tabs
					label="Secciones"
					value={tab}
					onChange={next => navigate({ search: { tab: next }, replace: true })}
					items={[
						{ value: 'profile', label: 'Perfil' },
						{ value: 'appearance', label: 'Apariencia' }
					]}
				/>
				<TabPanel value={tab}>
					{tab === 'profile' ? <ProfileTab /> : <AppearanceTab />}
				</TabPanel>
			</div>
		</>
	);
}

function ProfileTab() {
	const user = useCurrentUser();
	return (
		<SectionCard title="Perfil" description="Datos de tu cuenta.">
			<DataGrid>
				<DataItem label="Nombre">{`${user?.first_name ?? ''} ${user?.last_name ?? ''}`}</DataItem>
				<DataItem label="Correo">{user?.email}</DataItem>
			</DataGrid>
		</SectionCard>
	);
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: 'light', label: 'Claro', icon: Sun },
	{ value: 'dark', label: 'Oscuro', icon: Moon },
	{ value: 'system', label: 'Sistema', icon: Monitor }
];

function AppearanceTab() {
	const { theme, setTheme } = useTheme();
	return (
		<SectionCard title="Tema" description="Elegí cómo se ve el portal en este dispositivo.">
			<div role="radiogroup" aria-label="Tema" className="grid max-w-md grid-cols-3 gap-3">
				{THEMES.map(({ value, label, icon: Icon }) => (
					<button
						key={value}
						type="button"
						role="radio"
						aria-checked={theme === value}
						onClick={() => setTheme(value)}
						className={cn(
							'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
							theme === value && 'border-primary bg-accent text-accent-foreground'
						)}
					>
						<Icon className="size-5" />
						{label}
					</button>
				))}
			</div>
		</SectionCard>
	);
}
