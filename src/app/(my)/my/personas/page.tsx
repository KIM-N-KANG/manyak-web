import { BackHeader } from '@/components/layout/back-header';
import { PersonaListScreen } from '@/features/my/personas/components/persona-list-screen';
import { PERSONA_LIST_COPY } from '@/features/my/personas/constants';

export default function MyPersonasPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader title={PERSONA_LIST_COPY.headerTitle} />
      <PersonaListScreen />
    </div>
  );
}
