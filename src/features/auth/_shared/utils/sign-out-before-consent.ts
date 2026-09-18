'use client';

import { signOut } from 'next-auth/react';

import { resetAnalyticsUser } from '@/observability/analytics';

import { clearPendingLogin } from './pending-login-storage';

/**
 * 필수 동의를 마치지 않은 로그인을 끝낸다. 동의 조회가 403인 안내 시트의 로그아웃과
 * 이전 탭에서 끝내지 않은 로그인의 fail-closed 정리가 함께 쓴다.
 *
 * 이 상태에서는 회원 기능·부수 효과를 연 적이 없으므로 제작 복구 레코드 같은 회원 데이터
 * 정리는 필요 없다. 탭 로그인 표시와 분석 식별자만 지우고, 페이지를 다시 불러오지 않는다
 * (`redirect: false`) — Auth.js가 세션·백엔드 토큰 쿠키를 폐기한 뒤 세션을 다시 조회해
 * 같은 화면이 그 자리에서 게스트 상태로 바뀌므로 흰 화면 깜빡임이 없다.
 *
 * @returns signOut이 끝나면 resolve되는 Promise
 */
export async function signOutBeforeConsent(): Promise<void> {
  clearPendingLogin();
  resetAnalyticsUser();

  await signOut({ redirect: false });
}
