import { clearPendingCreditOrder } from '@/features/my/credits/utils/pending-credit-order-storage';
import {
  clearPendingCreationRequests,
  clearStoryCompletionRequests,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { resetAnalyticsUser } from '@/observability/analytics';

import { clearPendingLogin } from './pending-login-storage';

/**
 * 회원 세션이 끝날 때 브라우저에 남은 회원 귀속 상태를 지운다. 명시적 로그아웃·탈퇴·
 * 세션 만료 로그아웃이 공유한다.
 *
 * 분석 사용자 식별자를 초기화하고, 탭 로그인 표시와 제작 복구·완성 요청·결제 확인
 * 레코드를 비운다. 이 레코드들은 서버에서 되찾을 수 없고 다음 세션(다른 계정일 수
 * 있다)에 이월되면 안 된다. Auth.js `signOut` 자체는 호출하지 않는다 — 리다이렉트
 * 여부가 호출처마다 다르다.
 */
export function clearLocalMemberState(): void {
  resetAnalyticsUser();
  clearPendingLogin();
  clearPendingCreationRequests();
  clearStoryCompletionRequests();
  clearPendingCreditOrder();
}
