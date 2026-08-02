'use client';

import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  clearLinkResultCookie,
  readLinkResultCookie,
} from '@/features/my/_shared/utils/link-result-cookie';

import { PROVIDER_LABEL } from '../constants/link-account-copy';

type LinkResultNotice = {
  /** 갈라진 계정 안내 다이얼로그를 열어야 하는지 여부. */
  isLinkedToOtherUserOpen: boolean;
  /** 갈라진 계정 안내 다이얼로그를 닫는다. */
  dismissLinkedToOtherUser: () => void;
};

/**
 * 연동 플로우에서 복귀했을 때 서버가 남긴 결과 쿠키를 1회 소비해 안내하는 훅.
 * 토스트로 끝나는 결과는 여기서 처리하고, 계정이 이미 갈라진 409만 안내량이 많아
 * 다이얼로그가 필요하므로 열림 여부를 호출부에 돌려준다(스펙 §4-5 결정 기록).
 *
 * @returns 갈라진 계정 안내 다이얼로그의 열림 여부와 닫기 함수
 */
export function useLinkResultNotice(): LinkResultNotice {
  const queryClient = useQueryClient();
  const [result] = useState(readLinkResultCookie);
  const [isDismissed, setIsDismissed] = useState(false);
  const hasNoticedRef = useRef(false);

  useEffect(() => {
    if (!result || hasNoticedRef.current) {
      return;
    }

    hasNoticedRef.current = true;
    clearLinkResultCookie();

    if (result.result === 'linked_to_other_user') {
      return;
    }

    if (result.result === 'success') {
      toast.success(
        TOAST_MESSAGE.LINK_SUCCEEDED(PROVIDER_LABEL[result.provider]),
      );
    } else if (result.result === 'provider_already_linked') {
      toast.warning(TOAST_MESSAGE.LINK_ALREADY_LINKED);
    } else {
      toast.error(TOAST_MESSAGE.LINK_FAILED);

      return;
    }

    // 연동 성공과 "이미 연동됨"은 서버 상태가 화면과 다를 수 있으므로 다시 읽는다.
    void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
  }, [queryClient, result]);

  return {
    isLinkedToOtherUserOpen:
      result?.result === 'linked_to_other_user' && !isDismissed,
    dismissLinkedToOtherUser: () => setIsDismissed(true),
  };
}
