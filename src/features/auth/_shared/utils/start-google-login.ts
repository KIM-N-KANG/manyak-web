'use client';

import { signIn } from 'next-auth/react';

type StartGoogleLoginOptions = {
  /** 로그인 완료 후 복귀할 앱 내 상대 경로(호출부에서 resolveLoginCallbackUrl로 검증된 값). */
  redirectTo: string;
};

/**
 * 모든 Google 로그인 CTA의 공통 진입점이다.
 * 호출부별 직접 signIn 호출을 한 곳으로 모아, 인앱 브라우저 분기(핸드오프)를
 * 이 함수 내부에만 추가할 수 있게 한다(KNK-682).
 *
 * @param options.redirectTo 로그인 완료 후 복귀할 앱 내 상대 경로
 */
export async function startGoogleLogin({
  redirectTo,
}: StartGoogleLoginOptions): Promise<void> {
  await signIn('google', { redirectTo });
}
