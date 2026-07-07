'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetMyCreditsQueryKey,
  useClaimAttendance as useClaimAttendanceMutation,
} from '@/api/generated/endpoints/credits/credits';
import { TOAST_MESSAGE } from '@/constants/toast-message';

/**
 * 출석 보상을 요청하고 결과에 따라 토스트를 띄우는 훅.
 * 성공 시 크레딧 잔액 쿼리를 무효화해 잔액을 자동 갱신한다.
 */
export function useClaimAttendance() {
  const queryClient = useQueryClient();

  const mutation = useClaimAttendanceMutation({
    mutation: {
      onSuccess: (response) => {
        if (response.status !== 200) {
          toast.error(TOAST_MESSAGE.ATTENDANCE_FAILED);

          return;
        }

        const { rewarded, amount } = response.data;

        if (rewarded) {
          toast.success(TOAST_MESSAGE.ATTENDANCE_CLAIMED(amount ?? 0));
        } else {
          toast.info(TOAST_MESSAGE.ATTENDANCE_ALREADY);
        }

        void queryClient.invalidateQueries({
          queryKey: getGetMyCreditsQueryKey(),
        });
      },
      onError: () => {
        toast.error(TOAST_MESSAGE.ATTENDANCE_FAILED);
      },
    },
  });

  return {
    claimAttendance: () => mutation.mutate(),
    isClaiming: mutation.isPending,
  };
}
