import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

import { logoutOnServer } from './backend-client';
import { establishBackendSession } from './backend-session';
import { SESSION_COOKIE_MAX_AGE_SECONDS } from './token-cookie-policy';
import { clearBackendSession, readRefreshTokenCookie } from './token-cookies';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  // BFF 토큰 쿠키 수명(14일)과 정렬 — 불일치 창 제거. 기본 30일이면 14~30일
  // 사이 재방문 사용자가 회원 UI를 보면서 API 호출은 전부 익명 처리된다.
  session: { strategy: 'jwt', maxAge: SESSION_COOKIE_MAX_AGE_SECONDS },
  trustHost: true,
  pages: { signIn: '/login', error: '/login' },
  callbacks: {
    async jwt({ token, account, trigger, session }) {
      // 클라이언트는 온보딩 완료 신호(false)만 소비할 수 있다. true 업데이트는
      // 신규 가입 응답으로만 설정해 기존 회원이 임의로 온보딩을 다시 열지 못하게 한다.
      if (
        trigger === 'update' &&
        session?.inviteOnboardingPending === false &&
        typeof session.expectedUserId === 'string' &&
        session.expectedUserId === token.userId
      ) {
        token.inviteOnboardingPending = false;
      }

      // account는 최초 로그인(OAuth 콜백)에서만 존재한다. 이후 세션 조회는 그대로 통과.
      if (!account) {
        return token;
      }

      if (!account.id_token) {
        throw new Error('Google 응답에 id_token이 없습니다.');
      }

      // 백엔드 로그인 실패는 여기서 던져 NextAuth 로그인 자체를 실패시킨다.
      // "NextAuth 세션만 있고 백엔드 세션은 없는" 반쪽 상태를 만들지 않는다.
      const profile = await establishBackendSession(account.id_token);

      token.userId = profile.userId;
      token.nickname = profile.nickname;
      token.profileImageUrl = profile.profileImageUrl;
      token.inviteOnboardingPending = profile.isNewUser;

      return token;
    },
    session({ session, token }) {
      session.inviteOnboardingPending = token.inviteOnboardingPending === true;

      if (token.userId) {
        session.user.id = token.userId;
        session.user.name = token.nickname ?? null;
        session.user.image = token.profileImageUrl ?? null;
      }

      return session;
    },
  },
  events: {
    async signOut() {
      // refresh 토큰만 읽는다. access·expiresAt이 손상돼도 refresh가 살아 있으면
      // 세션이 유효하므로(backend-session의 복구 경로와 동일 전제), 여기서도
      // refresh 쿠키를 기준으로 백엔드 토큰을 확실히 폐기한다.
      const refreshToken = await readRefreshTokenCookie();

      if (refreshToken) {
        try {
          await logoutOnServer(refreshToken);
        } catch {
          // 백엔드 실패와 무관하게 로컬 세션은 폐기한다(스펙 FE-SCREEN-008 로그아웃).
        }
      }

      await clearBackendSession();
    },
  },
});
