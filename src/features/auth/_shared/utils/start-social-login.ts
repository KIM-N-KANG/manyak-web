'use client';

import { signIn } from 'next-auth/react';
import { toast } from 'sonner';

import { TOAST_MESSAGE } from '@/constants/toast-message';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';
import { leaveLayers } from '@/lib/history-layers';
import { detectInAppBrowser } from '@/lib/in-app-browser';

import { markPendingLogin } from './pending-login-storage';
import { cancelPendingSignupConsent } from './signup-consent-client';
import { startPopupLogin } from './start-popup-login';

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
 * 인앱의 Kakao와 팝업이 차단된 일반 브라우저만 같은 탭에서 signIn을 시작한다.
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

  // 팝업은 원래 탭이 OAuth 화면을 거치지 않아 로그인 뒤 뒤로가기가 인증 화면으로 가지 않는다. 인앱의 Kakao만
  // 카카오톡 인앱의 팝업 제약 때문에 같은 탭에서 시작한다. 일반 브라우저에서 팝업이 차단되면 같은 탭으로 폴백한다.
  if (provider === 'google' || !inAppBrowser) {
    const outcome = await startPopupLogin(provider, redirectTo);

    if (outcome !== 'blocked' || inAppBrowser) {
      if (outcome !== 'redirected') {
        toast.error(TOAST_MESSAGE.LOGIN_FAILED);
      }

      return outcome === 'redirected' ? 'redirected' : 'failed';
    }
  }

  return new Promise<SocialLoginOutcome>((resolve) => {
    leaveLayers(() => {
      signIn(provider, { redirectTo })
        .then(() => resolve('redirected'))
        .catch(() => {
          toast.error(TOAST_MESSAGE.LOGIN_FAILED);
          resolve('failed');
        });
    });
  });
}
