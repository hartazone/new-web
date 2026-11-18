import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

import { CODIGO_LENGTH, normalizeCodigo } from '@/features/reservas/model';
import { cn } from '@/shared/utils';

/**
 * Six boxes for the pickup code ("K7M 2QD"), with a gap after the third.
 * Typing advances, Backspace goes back, and pasting a whole code fills them.
 */
export function CodigoInput({
	value,
	onChange,
	onComplete,
	invalid,
	describedBy
}: {
	value: string;
	onChange: (value: string) => void;
	/** Called when the sixth character is typed. */
	onComplete?: (value: string) => void;
	invalid?: boolean;
	describedBy?: string;
}) {
	const refs = useRef<(HTMLInputElement | null)[]>([]);
	const chars = Array.from({ length: CODIGO_LENGTH }, (_, i) => value[i] ?? '');

	const focus = (i: number) => refs.current[Math.max(0, Math.min(CODIGO_LENGTH - 1, i))]?.focus();

	const write = (index: number, text: string) => {
		const clean = normalizeCodigo(text);
		if (!clean) return;
		const next = (value.slice(0, index) + clean).slice(0, CODIGO_LENGTH);
		onChange(next);
		focus(next.length);
		if (next.length === CODIGO_LENGTH) onComplete?.(next);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
		if (e.key === 'Backspace') {
			e.preventDefault();
			const at = chars[i] ? i : i - 1;
			if (at < 0) return;
			onChange(value.slice(0, at));
			focus(at);
		} else if (e.key === 'ArrowLeft') {
			focus(i - 1);
		} else if (e.key === 'ArrowRight') {
			focus(i + 1);
		}
	};

	const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const clean = normalizeCodigo(e.clipboardData.getData('text'));
		const next = clean.slice(0, CODIGO_LENGTH);
		onChange(next);
		focus(next.length);
		if (next.length === CODIGO_LENGTH) onComplete?.(next);
	};

	return (
		<div
			role="group"
			aria-label="Código de retiro"
			className="flex items-center gap-2 md:gap-2.5"
		>
			{chars.map((char, i) => (
				<input
					key={i}
					ref={el => {
						refs.current[i] = el;
					}}
					value={char}
					// Only the first empty box (or the last one) takes the focus from Tab.
					tabIndex={i === Math.min(value.length, CODIGO_LENGTH - 1) ? 0 : -1}
					inputMode="text"
					autoCapitalize="characters"
					autoComplete="off"
					spellCheck={false}
					maxLength={2}
					aria-label={`Carácter ${i + 1} de ${CODIGO_LENGTH}`}
					aria-invalid={invalid || undefined}
					aria-describedby={describedBy}
					onFocus={e => e.target.select()}
					onChange={e => write(Math.min(i, value.length), e.target.value.slice(-1))}
					onKeyDown={e => onKeyDown(e, i)}
					onPaste={onPaste}
					className={cn(
						'size-12 rounded-xl border-[1.5px] bg-card text-center text-2xl leading-none font-bold text-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-selection md:h-14 md:w-12 md:text-[28px]',
						i === 3 && 'ml-2 md:ml-3',
						invalid ? 'border-error' : 'border-border-strong'
					)}
				/>
			))}
		</div>
	);
}
