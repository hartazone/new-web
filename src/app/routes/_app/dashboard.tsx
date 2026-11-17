import { useQueries } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Archive, CircleCheck, FilePen, Package, Plus } from 'lucide-react';

import { useCurrentUser } from '@/features/auth/session';
import { itemService } from '@/features/items/service';
import type { ItemStatus } from '@/features/items/types';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { SectionCard, StatCard } from '@/shared/ui/layout/section-card';
import { Button } from '@/shared/ui/primitives/button';
import { Skeleton } from '@/shared/ui/primitives/skeleton';
import { formatNumber } from '@/shared/utils/format';

export const Route = createFileRoute('/_app/dashboard')({
	component: DashboardPage
});

const STATUSES: { status: ItemStatus | null; label: string; icon: typeof Package }[] = [
	{ status: null, label: 'Total items', icon: Package },
	{ status: 'active', label: 'Active', icon: CircleCheck },
	{ status: 'draft', label: 'Drafts', icon: FilePen },
	{ status: 'archived', label: 'Archived', icon: Archive }
];

/** Example dashboard: stat cards from count queries and a "recent" list. */
function DashboardPage() {
	const user = useCurrentUser();

	// One small query per card (page_size 1, we only need `elements`).
	const counts = useQueries({
		queries: STATUSES.map(({ status }) =>
			itemService.options.list({ page: 1, page_size: 1, status })
		)
	});
	return (
		<>
			<PageHeader
				title={`Welcome back${user ? `, ${user.first_name}` : ''}`}
				description="Here is what is happening in your workspace."
				actions={
					<Button asChild>
						<Link to="/items/new">
							<Plus /> New item
						</Link>
					</Button>
				}
			/>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{STATUSES.map(({ label, icon: Icon }, i) =>
					counts[i].isPending ? (
						<Skeleton key={label} className="h-[78px] rounded-xl" />
					) : (
						<StatCard
							key={label}
							label={label}
							icon={<Icon />}
							value={counts[i].data ? formatNumber(counts[i].data.elements) : '—'}
						/>
					)
				)}
			</div>

			<SectionCard title="Recently created" action={<Link to="/items">View all</Link>}>
				Hola
			</SectionCard>
		</>
	);
}
