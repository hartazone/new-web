import { type LinkOptions } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export type Crumb = { label: string; link?: LinkOptions };

/** Page heading: breadcrumbs, title, description, badges and actions on the right. */
export function PageHeader({
	title,
	description
}: {
	title: ReactNode;
	badges?: ReactNode;
	description?: ReactNode;
}) {
	return (
		<div className="w-full h-36 bg-primary rounded-b-[50px] flex flex-col justify-center gap-4 px-10 py-2">
			<span className="text-4xl font-serif font-bold">{title}</span>
			<span className="text-primary-foreground">{description}</span>
		</div>
	);
}
