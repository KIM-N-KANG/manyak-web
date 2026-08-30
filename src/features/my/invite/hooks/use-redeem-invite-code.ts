'use client';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import { useRedeemInviteCode as useRedeemInviteCodeMutation } from '@/api/generated/endpoints/invite/invite';
import { track } from '@/observability/analytics';

import { INVITE_REWARD_COPY } from '../constants';
import {
  type InviteCodeSource,
  normalizeInviteCode,
  resolveInviteCodeError,
} from '../utils/invite-code';

/**
 * 초대 코드를 입력·검증하고 등록 요청을 처리하는 훅.
 * 성공 시 사용자 조회(me) 쿼리를 무효화하고, 실패 시 에러 메시지를 노출한다.
 *
 * @param source 초대 코드를 입력한 경로(초대 페이지/온보딩) — 분석 이벤트에 사용
 * @param onSuccess 등록 성공 후 호출되는 콜백
 * @returns 코드 등록 함수, 등록 중 여부, 에러 메시지, 에러 초기화 함수
 */
export function useRedeemInviteCode({
  source,
  onSuccess,
}: {
  source: InviteCodeSource;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useRedeemInviteCodeMutation({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 200) {
          return;
        }

        setErrorMessage(null);
        track('client_invite_codeInput_succeeded', { source });
        toast.success(INVITE_REWARD_COPY.redeemedToast);
        void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
        onSuccess?.();
      },
      onError: (error) => {
        const resolved = resolveInviteCodeError(error);

        setErrorMessage(resolved.message);
        track('client_invite_codeInput_failed', {
          source,
          error_type: resolved.errorType,
        });
      },
    },
  });

  const redeemInviteCode = (value: string): boolean => {
    const code = normalizeInviteCode(value);

    if (!code) {
      setErrorMessage('코드를 입력해주세요');

      return false;
    }

    setErrorMessage(null);
    track('client_invite_codeInput_submitted', { source });
    mutation.mutate({ data: { code } });

    return true;
  };

  return {
    redeemInviteCode,
    isRedeeming: mutation.isPending,
    errorMessage,
    clearError: () => setErrorMessage(null),
  };
}
