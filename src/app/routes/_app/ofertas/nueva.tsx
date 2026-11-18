import { createFileRoute, useRouter } from '@tanstack/react-router';

import { NuevaOfertaForm } from '@/features/ofertas/nueva-oferta-form';
import { toast } from '@/shared/ui/hz/toast';
import { usePageInformation } from '@/shared/ui/layout/page-context';

export const Route = createFileRoute('/_app/ofertas/nueva')({
	component: NuevaOfertaPage
});

/** Screens 03–05: publish a surprise pack or a specific offer. */
function NuevaOfertaPage() {
	const navigate = Route.useNavigate();
	const router = useRouter();

	usePageInformation({
		title: 'Nueva oferta',
		description: 'Qué ofrecés, a qué precio y cuándo se retira.',
		back: { label: 'Mis ofertas', link: { to: '/ofertas' } }
	});

	return (
		<NuevaOfertaForm
			onCancel={() => router.history.back()}
			onPublished={(_, dia, apta) => {
				toast(
					apta
						? 'Oferta publicada. Ya se ve en la app.'
						: 'Oferta guardada. Abrila y confirmá que es apta para abrirla a reservas.'
				);
				navigate({ to: '/ofertas', search: { dia, publicada: apta || undefined } });
			}}
		/>
	);
}
