import { signIn } from 'next-auth/react';

import { APP_PATH } from '@/constants/app-path';
import { toLinkProviderId } from '@/lib/auth/link-account';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { detectInAppBrowser } from '@/lib/in-app-browser';

/**
 * 인앱 브라우저에서 연동을 시작할 수 없는지 판별한다. 연동은 재인증·연동 두 단계가
 * 모두 OAuth라 Google 인증이 반드시 끼는데, Google은 인앱 WebView의 인증을 막는다.
 *
 * @returns 인앱 브라우저라 연동을 시작할 수 없으면 true
 */
export function isAccountLinkBlocked(): boolean {
  return detectInAppBrowser(navigator.userAgent) !== null;
}

/**
 * 계정 연동 플로우를 시작한다. 먼저 이미 연동된 provider로 재인증하고(스펙 §4-5 —
 * 재인증 선행), 복귀 지점인 중계 화면이 대상 provider의 OAuth를 이어서 시작한다.
 *
 * @param currentProvider 재인증에 쓸, 이미 연동된 provider
 * @param targetProvider 새로 연동할 대상 provider
 */
export async function startAccountLink(
  currentProvider: SocialLoginProvider,
  targetProvider: SocialLoginProvider,
): Promise<void> {
  await signIn(toLinkProviderId(currentProvider), {
    redirectTo: `${APP_PATH.MY_LINK_CONTINUE}?target=${targetProvider}`,
  });
}
