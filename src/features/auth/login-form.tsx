import { Lock, UserIcon } from 'lucide-react';
import { FormErrorAlert, PasswordField, TextField, useZodForm } from '@/shared/ui/form';
import { Button } from '@/shared/ui/primitives/button';
import { Spinner } from '@/shared/ui/primitives/spinner';

import { AuthWebLoginPostBody } from '@/shared/api/hzApi'

const loginSchema = AuthWebLoginPostBody;

import { useLogin } from './session';
import type { WebLoginResponse } from '@/shared/api/models';
import { Link } from '@tanstack/react-router';

export function LoginForm({ onSuccess }: { onSuccess: (user: WebLoginResponse) => void }) {
	const login = useLogin();
	const { control, submit, isSubmitting } = useZodForm({
		schema: loginSchema,
		defaultValues: { username: '', password: '' },
		onSubmit: values => login.mutateAsync(values),
		onSuccess
	});

	return (
		<form noValidate onSubmit={submit} className="flex flex-col gap-5">
			<FormErrorAlert control={control} />
			<TextField
				control={control}
				name="username"
				label="Nombre de Usuario"
				autoComplete="username"
				placeholder="carlos_ruiz2006"
				description="El usuario con el que afiliaste tu negocio"
				icon={<UserIcon />}
			/>
			<PasswordField control={control} name="password" label="Contraseña" description="Ingresa tu contraseña." icon={<Lock/>} />
			<Button type="submit" size="lg" disabled={isSubmitting}>
				{isSubmitting ? <Spinner /> : <></>}
				Entrar</Button>
			<Link to='/'>Olvidé mi contraseña</Link>
		</form>
	);
}
