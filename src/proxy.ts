import { type NextRequest, NextResponse } from 'next/server';

import { APP_PATH } from '@/constants/app-path';
import { ONBOARDING_SEEN_COOKIE } from '@/features/onboarding/constants';

/**
 * NextAuth(JWT 전략) 세션 쿠키 이름. JWT가 약 4KB를 넘으면 Auth.js가
 * `.0`, `.1` 청크 쿠키로 분할하므로 접두사로 판별한다.
 */
const NEXTAUTH_SESSION_COOKIE_PREFIXES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
];

/**
 * 요청에 NextAuth 세션 쿠키가 있는지 이름만으로 낙관적으로 판별한다.
 * 토큰 검증은 하지 않는다 — 위조 쿠키는 온보딩을 건너뛸 뿐이고,
 * 실제 인증은 각 API 경로가 담당한다.
 *
 * @param request 판별할 요청
 * @returns 세션 쿠키가 있으면 true
 */
function hasMemberSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) =>
      NEXTAUTH_SESSION_COOKIE_PREFIXES.some(
        (base) => name === base || name.startsWith(`${base}.`),
      ),
    );
}

/**
 * 신규 방문자를 서버에서 온보딩 페이지로 보낸다.
 *
 * 클라이언트 리다이렉트는 홈이 먼저 그려진 뒤 이동해 화면이 깜빡이므로,
 * 첫 응답 전에 여기서 처리한다. 노출 판정의 정본(로컬스토리지)은 서버가
 * 읽을 수 없어 쿠키 부재만으로 낙관적으로 보내고, 생성 이력 등 세부 판정은
 * 온보딩 페이지 가드가 맡아 미충족이면 쿠키를 심고 홈으로 되돌린다.
 *
 * 원래 목적지는 `from` 쿼리로 넘겨, 노출 대상이 아니면 가드가 그리로 되돌린다.
 *
 * @param request 매처(`/`·`/chats`·`/more`)에 걸린 요청
 * @returns 온보딩 리다이렉트 또는 통과 응답
 */
export function proxy(request: NextRequest) {
  if (
    request.cookies.has(ONBOARDING_SEEN_COOKIE) ||
    hasMemberSessionCookie(request)
  ) {
    return NextResponse.next();
  }

  const url = new URL(APP_PATH.ONBOARDING, request.url);

  url.searchParams.set('from', request.nextUrl.pathname);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/', '/chats', '/more'],
};
