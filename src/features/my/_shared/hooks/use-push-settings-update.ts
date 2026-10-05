'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  getGetPushSettingsQueryKey,
  useUpdatePushSettings,
} from '@/api/generated/endpoints/push/push';

import type { PushConsentNoticeResult } from '../constants/push-copy';
import {
  buildPushSettingsUpdate,
  normalizePushSettings,
  type PushSettings,
  resolvePushConsentNotice,
} from '../utils/push-settings';

/** 광고·야간 동의 처리 결과 통지. 일시는 의사 표시 시점의 기기 시각이다. */
export type PushConsentNotice = {
  result: PushConsentNoticeResult;
  at: Date;
};

/**
 * 알림 설정을 전체 교체 PUT으로 저장하고 조회 캐시를 갱신하는 훅. 광고·야간 값이 바뀌면
 * 처리 결과 통지를 함께 돌려준다(프롬프트 시트와 설정 화면이 공유).
 *
 * @returns 저장 함수와 진행 여부
 */
export function usePushSettingsUpdate() {
  const queryClient = useQueryClient();
  const mutation = useUpdatePushSettings();
  const { mutateAsync } = mutation;

  const update = async (
    current: PushSettings,
    patch: Partial<PushSettings>,
  ): Promise<{ settings: PushSettings; notice: PushConsentNotice | null }> => {
    const at = new Date();
    const response = await mutateAsync({
      data: buildPushSettingsUpdate(current, patch),
    });

    if (response.status !== 200) {
      throw new Error(`push settings update failed: ${response.status}`);
    }

    queryClient.setQueryData(getGetPushSettingsQueryKey(), response);

    const settings = normalizePushSettings(response.data);
    const result = resolvePushConsentNotice(current, settings);

    return { settings, notice: result ? { result, at } : null };
  };

  return { update, isPending: mutation.isPending };
}
