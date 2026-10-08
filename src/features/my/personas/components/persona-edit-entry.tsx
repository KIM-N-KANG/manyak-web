'use client';

import { useList as usePersonas } from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';

import { PERSONA_EDIT_COPY, PERSONA_LIST_COPY } from '../constants';
import { useGuestLoginRedirect } from '../hooks/use-guest-login-redirect';
import { PersonaForm } from './persona-form';

type PersonaEditEntryProps = {
  personaId: string;
};

export function PersonaEditEntry({ personaId }: PersonaEditEntryProps) {
  const { isMember } = useMemberAccess();
  const { data, isPending, isError, refetch } = usePersonas({
    query: { enabled: isMember },
  });
  const persona =
    data?.status === 200
      ? data.data.find(({ id }) => id === personaId)
      : undefined;

  useGuestLoginRedirect();

  if (isError) {
    return (
      <RetryListStatus
        title={PERSONA_LIST_COPY.loadFailed}
        onRetry={() => refetch()}
      />
    );
  }

  if (isPending) {
    return <PageLoadingSpinner aria-label={PERSONA_LIST_COPY.loading} />;
  }

  if (!persona) {
    return <EmptyListNotice>{PERSONA_EDIT_COPY.notFound}</EmptyListNotice>;
  }

  return <PersonaForm key={persona.id} persona={persona} />;
}
