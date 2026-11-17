import { Link } from '@tanstack/react-router';

/** Logo + app name. Replace /public/favicon.svg and `appConfig.name` with your own. */
export function Brand() {
	return (
		<Link to="/" className="flex items-center gap-4 font-semibold tracking-tight">
			<img src="/full-logo.svg" alt="logo-hartazone" className="size-40" />
		</Link>
	);
}
