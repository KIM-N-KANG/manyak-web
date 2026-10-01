import { revokePushToken } from '@/features/my/_shared/utils/revoke-push-token';
import { clearPendingCreditOrder } from '@/features/my/credits/utils/pending-credit-order-storage';
import { clearCreationStorage } from '@/features/stories/_shared/utils/creation-request-storage';
import { resetAnalyticsUser } from '@/observability/analytics';

import { clearPendingLogin } from './pending-login-storage';

/**
 * 회원 세션이 끝날 때 브라우저에 남은 회원 귀속 상태를 지운다. 명시적 로그아웃·탈퇴·
 * 세션 만료 로그아웃이 공유한다.
 *
 * 분석 사용자 식별자를 초기화하고, 탭 로그인 표시와 제작 복구·완성 요청·결제 확인
 * 레코드를 비운다. 이 레코드들은 서버에서 되찾을 수 없고 다음 세션(다른 계정일 수
 * 있다)에 이월되면 안 된다. 이 기기의 푸시 토큰은 서버·브라우저에서 fire-and-forget으로
 * 지운다(세션 쿠키가 살아 있는 동안 불러야 서버 삭제가 통과한다). Auth.js `signOut`
 * 자체는 호출하지 않는다 — 리다이렉트 여부가 호출처마다 다르다.
 */
export async function clearLocalMemberState(): Promise<void> {
  revokePushToken();
  resetAnalyticsUser();
  clearPendingLogin();

  clearPendingCreditOrder();

  try {
    await clearCreationStorage();
  } catch {
    // 동기 세대값이 이전 기록 접근을 막으며 다음 DB 접근에서 정리를 재시도한다.
  }
}
