'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { getPushSettings } from '@/api/generated/endpoints/push/push';
import { TOAST_MESSAGE } from '@/constants/toast-message';

import {
  answerMarketingConsentRecord,
  readMarketingConsentRecord,
  writeMarketingConsentRecord,
} from '../utils/marketing-consent-storage';
import { normalizePushSettings } from '../utils/push-settings';
import {
  type PushConsentNotice,
  usePushSettingsUpdate,
} from './use-push-settings-update';

/**
 * 광고 알림 동의 질문(필수 동의 시트의 선택 항목·재질문 시트)의 답을 처리하는 훅.
 * 허용이면 현재 설정을 읽어 광고만 켠 전체 교체 PUT으로 저장하고 처리 결과 통지를 띄우며,
 * 거절이면 회원 기록만 남긴다. 저장 실패는 토스트만 띄운다(설정 화면에서 다시 켤 수 있다).
 *
 * @returns 답 처리 함수, 진행 여부, 통지 상태와 닫기
 */
export function useMarketingConsent() {
  const { update } = usePushSettingsUpdate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<PushConsentNotice | null>(null);

  const answer = async (userId: string, accepted: boolean): Promise<void> => {
    writeMarketingConsentRecord(
      userId,
      answerMarketingConsentRecord(
        readMarketingConsentRecord(userId),
        accepted,
      ),
    );

    if (!accepted) {
      return;
    }

    setIsSubmitting(true);

    try {
      const current = await getPushSettings();
      const settings = normalizePushSettings(
        current.status === 200 ? current.data : undefined,
      );

      if (settings.marketingPush) {
        return;
      }

      const result = await update(settings, { marketingPush: true });

      setNotice(result.notice);
    } catch {
      toast.error(TOAST_MESSAGE.PUSH_SETTINGS_SAVE_FAILED);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { answer, isSubmitting, notice, closeNotice: () => setNotice(null) };
}
