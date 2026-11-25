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
 * - `update(current, patch)`: `current`에 `patch`를 덮어쓴 전체 설정을 저장하고, 저장된 설정
 *   `settings`와 광고, 야간 값 변경에 따른 처리 결과 통지 `notice`(변경 없으면 null)를 돌려준다.
 * - `isPending`: 저장 요청이 진행 중인지
 * @throws {Error} `update`는 응답 status가 200이 아니면 Error로 reject한다. 요청 자체가 실패해도
 *   그 오류로 reject되므로 호출부가 잡아 실패를 안내해야 한다.
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
