import { BackHeader } from '@/components/layout/back-header';
import { PersonaCreateForm } from '@/features/my/personas/components/persona-create-form';
import { PERSONA_CREATE_COPY } from '@/features/my/personas/constants';

export default function MyPersonaNewPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title={PERSONA_CREATE_COPY.headerTitle} />
      <main className="flex min-h-0 flex-1 flex-col">
        <PersonaCreateForm />
      </main>
    </div>
  );
}
