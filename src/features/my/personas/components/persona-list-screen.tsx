'use client';

import { useEffect } from 'react';

import {
  Delete02Icon,
  Edit02Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  getListQueryKey as getPersonasQueryKey,
  useDelete1 as useDeletePersona,
  useList as usePersonas,
} from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import type { UserPersonaResponse } from '@/api/generated/models';
import { CardOptionsSheet } from '@/components/common/card-options-sheet';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { PERSONA_MAX_COUNT } from '@/features/my/_shared/constants/persona';
import { clearCreatedPersona } from '@/features/stories/_shared/utils/created-persona-selection';
import { track } from '@/observability/analytics';

import { PERSONA_LIST_COPY } from '../constants';
import { useGuestLoginRedirect } from '../hooks/use-guest-login-redirect';
import { parsePersonaDescription } from '../utils/persona-description';

function PersonaRow({ persona }: { persona: UserPersonaResponse }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deletePersona = useDeletePersona();
  const name = persona.name ?? '';
  const summary = parsePersonaDescription(persona.description)
    .feature.split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .join(' ');

  const handleDelete = async () => {
    if (!persona.id) {
      return;
    }

    try {
      await deletePersona.mutateAsync({ personaId: persona.id });
      track('client_personaList_persona_deleted');
      clearCreatedPersona();
      toast.success(TOAST_MESSAGE.PERSONA_DELETED);
    } catch {
      toast.error(TOAST_MESSAGE.PERSONA_DELETE_FAILED);
    } finally {
      void queryClient.invalidateQueries({ queryKey: getPersonasQueryKey() });
    }
  };

  return (
    <li className="flex items-start gap-2 px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-semibold">{name}</p>
        <p className="line-clamp-2 text-sm wrap-anywhere text-foreground-secondary">
          {summary}
        </p>
      </div>
      <CardOptionsSheet
        kind={PERSONA_LIST_COPY.optionsKind}
        title={name}
        triggerAriaLabel={PERSONA_LIST_COPY.optionsTrigger(name)}
        items={[
          {
            icon: Edit02Icon,
            label: PERSONA_LIST_COPY.edit,
            onSelect: () => {
              if (persona.id) {
                router.push(APP_PATH.MY_PERSONA_EDIT(persona.id));
              }
            },
          },
          {
            icon: Delete02Icon,
            label: PERSONA_LIST_COPY.delete,
            variant: 'destructive',
            onSelect: handleDelete,
            confirm: {
              title: PERSONA_LIST_COPY.deleteConfirmTitle,
              description: PERSONA_LIST_COPY.deleteConfirmDescription,
              isPending: deletePersona.isPending,
            },
          },
        ]}
      />
    </li>
  );
}

export function PersonaListScreen() {
  const router = useRouter();
  const { isMember } = useMemberAccess();
  const { data, isPending, isError, refetch } = usePersonas({
    query: { enabled: isMember },
  });
  const personas = data?.status === 200 ? data.data : [];

  useGuestLoginRedirect();
  useEffect(() => {
    track('client_personaList_viewed');
  }, []);

  const handleCreate = () => {
    track('client_personaList_createButton_clicked');

    if (personas.length >= PERSONA_MAX_COUNT) {
      toast.error(TOAST_MESSAGE.PERSONA_LIMIT_REACHED);

      return;
    }

    router.push(APP_PATH.MY_PERSONA_NEW);
  };

  const addButton = (
    <Button
      type="button"
      variant="secondary"
      disabled={!isMember}
      onClick={handleCreate}>
      <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
      {PERSONA_LIST_COPY.create}
    </Button>
  );

  return (
    <main className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
      {isError ? (
        <RetryListStatus
          title={PERSONA_LIST_COPY.loadFailed}
          onRetry={() => refetch()}
        />
      ) : isPending ? (
        <PageLoadingSpinner aria-label={PERSONA_LIST_COPY.loading} />
      ) : personas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="text-sm text-foreground-secondary">
            {PERSONA_LIST_COPY.empty}
          </p>
          {addButton}
        </div>
      ) : (
        <>
          <ul aria-label={PERSONA_LIST_COPY.headerTitle}>
            {personas.map((persona) => (
              <PersonaRow key={persona.id} persona={persona} />
            ))}
          </ul>
          <div className="flex justify-center px-4 pt-2 pb-4">{addButton}</div>
        </>
      )}
    </main>
  );
}
