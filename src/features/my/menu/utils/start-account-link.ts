import { getSession, signIn } from 'next-auth/react';

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
 * 재인증 OAuth 요청에 실을 authorization 파라미터를 만든다. 현재 계정이 Google이면
 * 세션의 이메일을 `login_hint`로 실어, 구글 세션이 살아 있을 때 계정 선택 화면 없이
 * 조용히 통과하게 한다. 재인증 대상은 어차피 현재 계정 하나로 고정이므로 힌트가
 * 선택을 뺏지 않고, 다른 계정을 골라 REAUTH_FAILED(403)가 나는 사고도 줄인다.
 * 카카오는 대응 파라미터가 없고 자체 세션이면 원래 자동 통과라 힌트를 싣지 않는다.
 * 이메일은 Auth.js가 로그인 시 기본 클레임으로 보관한 값이다(카카오 로그인 계정은
 * scope가 openid뿐이라 이메일이 없지만, 그 경우 현재 provider도 카카오다).
 *
 * @param currentProvider 재인증에 쓸, 이미 연동된 provider
 * @returns signIn에 전달할 authorization 파라미터(실을 값이 없으면 undefined)
 */
async function buildReauthAuthorizationParams(
  currentProvider: SocialLoginProvider,
): Promise<Record<string, string> | undefined> {
  if (currentProvider !== 'google') {
    return undefined;
  }

  const email = (await getSession())?.user?.email;

  return email ? { login_hint: email } : undefined;
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
  await signIn(
    toLinkProviderId(currentProvider),
    { redirectTo: `${APP_PATH.MY_LINK_CONTINUE}?target=${targetProvider}` },
    await buildReauthAuthorizationParams(currentProvider),
  );
}
