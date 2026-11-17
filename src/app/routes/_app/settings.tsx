import { createFileRoute } from '@tanstack/react-router';
import { Monitor, Moon, Sun } from 'lucide-react';
import { z } from 'zod';

import { useCurrentUser } from '@/features/auth/session';
import { PageHeader } from '@/shared/ui/layout/page-header';
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

	return (
		<>
			<PageHeader title="Settings" description="Manage your account and preferences." />
			<div className="flex flex-col gap-6">
				<Tabs
					label="Settings sections"
					value={tab}
					onChange={next => navigate({ search: { tab: next }, replace: true })}
					items={[
						{ value: 'profile', label: 'Profile' },
						{ value: 'appearance', label: 'Appearance' }
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
		<SectionCard title="Profile" description="Information from your account.">
			<DataGrid>
				<DataItem label="Name">{user?.first_name}</DataItem>
				<DataItem label="Email">{user?.email}</DataItem>
			</DataGrid>
		</SectionCard>
	);
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor }
];

function AppearanceTab() {
	const { theme, setTheme } = useTheme();
	return (
		<SectionCard title="Theme" description="Choose how the app looks on this device.">
			<div role="radiogroup" aria-label="Theme" className="grid max-w-md grid-cols-3 gap-3">
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
