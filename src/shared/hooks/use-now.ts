import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs` (for countdowns and "open until" labels). */
export function useNow(intervalMs = 30_000) {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs]);

	return now;
}
