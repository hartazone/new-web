import type { ComponentProps, ReactNode } from 'react';
import { Controller, type FieldValues, type Path } from 'react-hook-form';

import { Field, FieldDescription, FieldError, FieldLabel } from '@/shared/ui/primitives/field';
import { Input } from '@/shared/ui/primitives/input';
import { cn } from '@/shared/utils';

import type { FormControl } from './types';

type InputFieldProps<TValues extends FieldValues> = Omit<
	ComponentProps<typeof Input>,
	'name' | 'defaultValue' | 'value' | 'onChange'
> & {
	control: FormControl<TValues>;
	name: Path<TValues>;
	label: string;
	description?: ReactNode;
	/** Class for the whole field block (label + input + messages). */
	fieldClassName?: string;
	/** Icon inside the input, on the left. */
	icon?: ReactNode;
	/** Something inside the input, on the right (e.g. a toggle button). */
	trailing?: ReactNode;
	/** Converts the raw input string into the form value. Defaults to the string itself. */
	parse?: (raw: string) => unknown;
	/** Called after the form value changes. */
	onValueChange?: (value: unknown) => void;
};

/**
 * Base for every `<input>`-backed field: label, icon, description and the
 * error message wired to react-hook-form. `TextField`, `NumberField`,
 * `DateField`… are thin wrappers that set `type` and `parse`.
 */
export function InputField<TValues extends FieldValues>({
	control,
	name,
	label,
	description,
	fieldClassName,
	icon,
	trailing,
	parse = raw => raw,
	onValueChange,
	id,
	className,
	...inputProps
}: InputFieldProps<TValues>) {
	const inputId = id ?? name;

	return (
		<Controller
			name={name}
			control={control}
			render={({ field, fieldState }) => {
				const invalid = fieldState.invalid;
				return (
					<Field className={fieldClassName} data-invalid={invalid}>
						<FieldLabel htmlFor={inputId}>{label}</FieldLabel>
						<div className="relative">
							{icon && (
								<span
									className={cn(
										'pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&>svg]:size-4 [&>svg]:shrink-0',
										invalid && 'text-destructive'
									)}
								>
									{icon}
								</span>
							)}
							<Input
								{...inputProps}
								id={inputId}
								name={field.name}
								ref={field.ref}
								value={field.value ?? ''}
								aria-invalid={invalid}
								onBlur={field.onBlur}
								onChange={event => {
									const value = parse(event.target.value);
									field.onChange(value);
									onValueChange?.(value);
								}}
								className={cn(icon && 'pl-9', trailing && 'pr-10', className, "bg-card border-border border-2")}
							/>
							{trailing && (
								<span className="absolute inset-y-0 right-3 flex items-center">
									{trailing}
								</span>
							)}
						</div>
						{description && <FieldDescription>{description}</FieldDescription>}
						{invalid && <FieldError errors={[fieldState.error]} />}
					</Field>
				);
			}}
		/>
	);
}

export type { InputFieldProps };
