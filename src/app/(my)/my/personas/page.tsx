import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { PersonaListScreen } from '@/features/my/personas/components/persona-list-screen';
import { PERSONA_LIST_COPY } from '@/features/my/personas/constants';

export default function MyPersonasPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={PERSONA_LIST_COPY.headerTitle}
        fallbackHref={APP_PATH.MAIN.MY}
      />
      <PersonaListScreen />
    </div>
  );
}
