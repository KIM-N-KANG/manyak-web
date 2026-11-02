import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useGetUsersMePersonas as usePersonas } from '@/api/generated/endpoints/user-persona-controller/user-persona-controller';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { PERSONA_MAX_COUNT } from '@/features/my/_shared/constants/persona';
import { markPersonaCreationOrigin } from '@/features/stories/_shared/utils/created-persona-selection';
import { leaveLayers } from '@/lib/history-layers';
import { track } from '@/observability/analytics';

/**
 * 스토리 상세에서 고를 수 있는 내 페르소나와 새 페르소나 만들기를 제공하는 훅.
 * 상세 본문의 Select와 채팅 시작 시트가 함께 쓴다.
 *
 * @param storyId 페르소나를 만든 뒤 돌아올 스토리 id
 * @returns 내 페르소나 목록, 만들기 시작 함수, 게스트에게 띄울 로그인 시트 상태
 */
export function useDetailPersonas(storyId: string) {
  const router = useRouter();
  const { isMember, isGuest } = useMemberAccess();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { data } = usePersonas({ query: { enabled: isMember } });
  const personas = isMember && data?.status === 200 ? data.data : [];

  /** 새 페르소나 만들기를 시작한다. 게스트는 로그인 시트를, 상한에 닿은 회원은 토스트를 띄운다. */
  const createPersona = () => {
    track('client_storyDetail_personaCreateButton_clicked', {
      story_id: storyId,
    });

    if (isGuest) {
      setIsLoginOpen(true);

      return;
    }

    if (!isMember) {
      return;
    }

    if (personas.length >= PERSONA_MAX_COUNT) {
      toast.error(TOAST_MESSAGE.PERSONA_LIMIT_REACHED);

      return;
    }

    markPersonaCreationOrigin(storyId);
    leaveLayers(() => router.push(APP_PATH.MY_PERSONA_NEW));
  };

  return {
    personas,
    createPersona,
    isLoginOpen: isLoginOpen && isGuest,
    setIsLoginOpen,
  };
}
