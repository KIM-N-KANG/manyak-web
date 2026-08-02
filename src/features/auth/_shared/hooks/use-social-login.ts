'use client';

import { useEffect, useState } from 'react';

import { startSocialLogin } from '@/features/auth/_shared/utils/start-social-login';
import type { SocialLoginProvider } from '@/lib/auth/social-provider';

/** 소셜 로그인 버튼 스피너의 접근성 라벨. */
export const SOCIAL_LOGIN_PENDING_LABEL = '로그인 진행 중';

type StartLoginOptions = {
  /** 로그인에 사용할 소셜 provider. */
  provider: SocialLoginProvider;
  /** 로그인 완료 후 복귀할 앱 내 상대 경로(호출부에서 resolveLoginCallbackUrl로 검증된 값). */
  redirectTo: string;
};

/**
 * 소셜 로그인 CTA의 진행 상태를 관리하는 훅.
 * 로그인을 시작하면 provider를 pending으로 잡아 버튼 스피너·비활성화에 쓰게 하고,
 * 이탈 없이 실패하면 풀어 재시도할 수 있게 한다. OAuth 화면에서 뒤로가기로 돌아오면
 * bfcache가 pending 상태까지 복원해 버튼이 영영 잠기므로, pageshow(persisted)에서
 * 상태를 리셋한다.
 *
 * @returns 진행 중인 provider(없으면 null)와 로그인 시작 함수
 */
export function useSocialLogin() {
  const [pendingProvider, setPendingProvider] =
    useState<SocialLoginProvider | null>(null);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setPendingProvider(null);
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const startLogin = async ({
    provider,
    redirectTo,
  }: StartLoginOptions): Promise<void> => {
    if (pendingProvider !== null) {
      return;
    }

    setPendingProvider(provider);

    const outcome = await startSocialLogin({ provider, redirectTo });

    if (outcome === 'failed') {
      setPendingProvider(null);
    }
  };

  return { pendingProvider, startLogin };
}
