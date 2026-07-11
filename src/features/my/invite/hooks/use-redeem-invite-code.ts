'use client';

import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import { useRedeemInviteCode as useRedeemInviteCodeMutation } from '@/api/generated/endpoints/invite/invite';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { track } from '@/observability/analytics';

import {
  type InviteCodeSource,
  normalizeInviteCode,
  resolveInviteCodeError,
} from '../utils/invite-code';

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
        toast.success(TOAST_MESSAGE.INVITE_REDEEMED);
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
      setErrorMessage('코드를 입력해 주세요');

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
