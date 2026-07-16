'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getMeQueryKey } from '@/api/generated/endpoints/auth/auth';
import { useClaimAttendance as useClaimAttendanceMutation } from '@/api/generated/endpoints/credits/credits';
import { TOAST_MESSAGE } from '@/constants/toast-message';

type UseClaimAttendanceOptions = {
  /** 출석 보상이 실제 지급됐을 때(rewarded=true)만 호출된다. 이미 출석 응답은 토스트 안내만 한다. */
  onRewarded?: () => void;
};

/**
 * 출석 보상을 요청하고 결과에 따라 토스트를 띄우는 훅.
 * 성공 시 사용자 조회(me) 쿼리를 무효화해 잔액·출석 여부를 자동 갱신한다.
 *
 * @param options 출석 처리 완료 콜백 등 부가 옵션
 * @returns 출석 요청 함수와 요청 중 여부
 */
export function useClaimAttendance({
  onRewarded,
}: UseClaimAttendanceOptions = {}) {
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
          queryKey: getMeQueryKey(),
        });

        if (rewarded) {
          onRewarded?.();
        }
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
