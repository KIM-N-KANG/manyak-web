import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';
import { type CreditShortageTrigger, track } from '@/observability/analytics';

/**
 * 회원 이프 부족을 현재 화면의 오류 토스트로 안내한다.
 *
 * @param trigger 이프 부족이 발생한 사용자 동작 지점
 */
export function showCreditShortageToast(trigger: CreditShortageTrigger): void {
  // 기존 분석 대시보드와의 호환을 위해 Dialog 이벤트 이름을 유지한다.
  track('client_creditShortageDialog_shown', { trigger });
  toast.error(TOAST_MESSAGE.CREDIT_SHORTAGE);
}
