import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { PersonaForm } from '@/features/my/personas/components/persona-form';
import { PERSONA_CREATE_COPY } from '@/features/my/personas/constants';

export default function MyPersonaNewPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={PERSONA_CREATE_COPY.headerTitle}
        fallbackHref={APP_PATH.MY_PERSONAS}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <PersonaForm />
      </main>
    </div>
  );
}
