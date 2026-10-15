import { ensureFreshAccessToken } from '@/lib/auth/backend-session';
import { SESSION_EXPIRED_HEADER } from '@/lib/auth/session-expiry';
import { SESSION_REFRESH_GATE_SKEW_MS } from '@/lib/auth/token-cookie-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * 브라우저 재발급 게이트가 부르는 단일 재발급 지점. 만료가 임박했으면 refresh 토큰을 한 번
 * 회전해 새 쿠키를 심는다. 같은 화면의 다른 요청은 이 응답을 기다린 뒤 새 쿠키로 프록시를
 * 지나가므로, 인스턴스가 갈려도 같은 refresh 토큰으로 재발급이 몰리지 않는다.
 *
 * @returns 204, 세션 만료면 401과 만료 헤더, 일시 실패면 503
 */
const refreshSession = async (): Promise<Response> => {
  const auth = await ensureFreshAccessToken(Date.now(), {
    refreshSkewMs: SESSION_REFRESH_GATE_SKEW_MS,
  });

  if (auth.status === 'expired') {
    return new Response(null, {
      status: 401,
      headers: { ...NO_STORE, [SESSION_EXPIRED_HEADER]: '1' },
    });
  }

  if (auth.status === 'degraded') {
    return new Response(null, { status: 503, headers: NO_STORE });
  }

  return new Response(null, { status: 204, headers: NO_STORE });
};

export const POST = refreshSession;
