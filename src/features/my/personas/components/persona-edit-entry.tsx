'use client';

import { useGetUsersMePersonas as usePersonas } from '@/api/generated/endpoints/personas/personas';
import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { useGuestLoginRedirect } from '@/features/my/_shared/hooks/use-guest-login-redirect';

import { PERSONA_EDIT_COPY, PERSONA_LIST_COPY } from '../constants';
import { PersonaForm } from './persona-form';

type PersonaEditEntryProps = {
  personaId: string;
};

/**
 * 페르소나 수정 화면의 진입점. 단건 조회 API가 없어 내 페르소나 목록에서 id로 찾아 폼에 넘기고,
 * 목록에 없으면 찾을 수 없음 안내를 그린다.
 */
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
