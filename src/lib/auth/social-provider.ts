/**
 * 앱이 지원하는 소셜 로그인 provider. NextAuth 프로바이더 id 및 백엔드
 * `POST /auth/login/{provider}` 경로 세그먼트와 값이 일치한다(스펙 §3-8).
 */
export type SocialLoginProvider = 'google' | 'kakao';

/**
 * 값이 지원하는 소셜 로그인 provider인지 판별한다.
 *
 * @param value 검사할 값(NextAuth account.provider 등)
 * @returns 지원 provider이면 true
 */
export function isSocialLoginProvider(
  value: unknown,
): value is SocialLoginProvider {
  return value === 'google' || value === 'kakao';
}
