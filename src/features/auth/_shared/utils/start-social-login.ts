'use client';

import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { detectInAppBrowser } from '@/lib/in-app-browser';

import { markPendingLogin } from './pending-login-storage';
import { cancelPendingSignupConsent } from './signup-consent-client';
import { startGooglePopupLogin } from './start-google-popup-login';

type StartSocialLoginOptions = {
  /** 로그인에 사용할 소셜 provider. */
  provider: SocialLoginProvider;
  /** 로그인 완료 후 복귀할 앱 내 상대 경로(호출부에서 resolveLoginCallbackUrl로 검증된 값). */
  redirectTo: string;
};

/**
 * 소셜 로그인 시작 결과. 페이지 이탈이 시작됐으면 `redirected`, 현재 화면에 남아
 * 재시도가 필요하면 `failed`다. 호출부는 이 값으로 버튼 로딩 상태를 해제할지 판단한다.
 */
export type SocialLoginOutcome = 'redirected' | 'failed';

/**
 * 모든 소셜 로그인 CTA의 공통 진입점이다.
 * 감지된 인앱의 Google 로그인은 Auth.js 팝업에서 진행하고 원래 탭의 세션을 확인한다.
 * Kakao와 일반 브라우저의 Google 로그인은 같은 탭에서 signIn을 시작한다.
 *
 * @param options.provider 로그인에 사용할 소셜 provider
 * @param options.redirectTo 로그인 완료 후 복귀할 앱 내 상대 경로
 * @returns 페이지 이탈 시작 여부를 담은 결과
 */
export async function startSocialLogin({
  provider,
  redirectTo,
}: StartSocialLoginOptions): Promise<SocialLoginOutcome> {
  const inAppBrowser = detectInAppBrowser(navigator.userAgent);

  // 팝업도 원래 탭의 동의 게이트에서 이어가므로 인증 시작 전에 표시한다.
  markPendingLogin();
  // 이 브라우저에 남은 이전 시도의 가입 대기가 이번 로그인의 실패·취소 뒤 시트로 뜨지 않게
  // 비운다. 팝업은 사용자 제스처 안에서 먼저 열려야 하므로 기다리지 않는다.
  void cancelPendingSignupConsent();

  if (provider === 'google' && inAppBrowser) {
    const outcome = await startGooglePopupLogin(redirectTo);

    if (outcome === 'failed') {
      toast.error(TOAST_MESSAGE.LOGIN_FAILED);
    }

    return outcome;
  }

  try {
    await signIn(provider, { redirectTo });
  } catch {
    toast.error(TOAST_MESSAGE.LOGIN_FAILED);

    return 'failed';
  }

  return 'redirected';
}
