import { Link } from '@tanstack/react-router';

/** Vertical Hartazone logo at the top of the sidebar. */
export function Brand() {
	return (
		<Link
			to="/"
			aria-label="Hartazone, ir al inicio"
			className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<img
				src="/logo-vertical.svg"
				alt=""
				width={103}
				height={120}
				className="h-[120px] w-[103px]"
			/>
		</Link>
	);
}
