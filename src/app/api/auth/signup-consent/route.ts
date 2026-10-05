import type { SignupConsentSummary } from '@/lib/auth/signup-consent';
import {
  clearPendingSignupConsent,
  readPendingSignupConsent,
} from '@/lib/auth/signup-consent-cookie';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * 대기 중인 가입 동의의 동의 상태와 만료 시각을 돌려준다. 대기 코드는 HttpOnly 쿠키에만
 * 두고 응답에 담지 않는다. 대기가 없거나 만료됐으면 404다.
 *
 * @returns 가입 동의 요약 또는 404
 */
export async function GET(): Promise<Response> {
  const pending = await readPendingSignupConsent();

  if (!pending) {
    return new Response(null, { status: 404, headers: NO_STORE });
  }

  const summary: SignupConsentSummary = {
    consents: pending.consents,
    expiresAt: pending.expiresAt,
  };

  return Response.json(summary, { headers: NO_STORE });
}

/**
 * 가입 동의 대기를 취소한다. 서버의 대기 코드는 TTL로 사라지므로 백엔드를 부르지 않는다.
 *
 * @returns 204
 */
export async function DELETE(): Promise<Response> {
  await clearPendingSignupConsent();

  return new Response(null, { status: 204, headers: NO_STORE });
}
