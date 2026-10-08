import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { PersonaEditEntry } from '@/features/my/personas/components/persona-edit-entry';
import { PERSONA_EDIT_COPY } from '@/features/my/personas/constants';

type MyPersonaEditPageProps = {
  params: Promise<{ personaId: string }>;
};

export default async function MyPersonaEditPage({
  params,
}: MyPersonaEditPageProps) {
  const { personaId } = await params;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={PERSONA_EDIT_COPY.headerTitle}
        fallbackHref={APP_PATH.MY_PERSONAS}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <PersonaEditEntry personaId={personaId} />
      </main>
    </div>
  );
}
