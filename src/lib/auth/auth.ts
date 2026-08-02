import NextAuth from 'next-auth';
import type { OIDCConfig } from 'next-auth/providers';
import Google from 'next-auth/providers/google';

import { logoutOnServer } from './backend-client';
import { establishBackendSession } from './backend-session';
import { parseLinkProviderId } from './link-account';
import { processLinkCallback } from './link-callback';
import { restoreSessionClaims } from './session-token';
import { isSocialLoginProvider } from './social-provider';
import { SESSION_COOKIE_MAX_AGE_SECONDS } from './token-cookie-policy';
import { clearBackendSession, readRefreshTokenCookie } from './token-cookies';

/**
 * 카카오 로그인 프로바이더. 기본 제공 프로바이더 대신 issuer를 지정한 OIDC로 직접
 * 선언한다 — 기본 프로바이더는 jwks_uri를 몰라 id_token 서명 검증에 실패한다(스펙 §3-8).
 * - scope는 `openid` 단독 고정: 콘솔에 동의항목이 없어 다른 scope는 인가가 거절된다.
 * - 토큰 교환은 `client_secret_post` 명시: 카카오가 지원하는 유일한 방식인데 Auth.js
 *   기본값은 `client_secret_basic`이라 미지정 시 invalid_client로 실패한다.
 */
const Kakao: OIDCConfig<{ sub: string }> = {
  id: 'kakao',
  name: 'Kakao',
  type: 'oidc',
  issuer: 'https://kauth.kakao.com',
  clientId: process.env.AUTH_KAKAO_ID,
  clientSecret: process.env.AUTH_KAKAO_SECRET,
  authorization: { params: { scope: 'openid' } },
  client: { token_endpoint_auth_method: 'client_secret_post' },
};

/**
 * 계정 연동 전용 프로바이더 변형. 로그인 프로바이더와 같은 소셜 앱 자격을 쓰되 id가
 * 달라 콜백 URL이 갈라지고(`/api/auth/callback/link-*`), jwt 콜백이 이 id로 연동
 * 플로우를 식별해 백엔드 로그인·세션 교체 없이 연동만 수행한다. Auth.js는 프로바이더
 * id로 환경 변수를 추론하므로(`AUTH_LINK_GOOGLE_ID` 같은 값은 없다) 자격을 명시한다.
 * 두 콜백 URL은 Google·Kakao 콘솔에 리디렉션 URI로 등록돼 있어야 한다.
 */
const LinkGoogle = Google({
  id: 'link-google',
  clientId: process.env.AUTH_GOOGLE_ID,
  clientSecret: process.env.AUTH_GOOGLE_SECRET,
});

const LinkKakao: OIDCConfig<{ sub: string }> = { ...Kakao, id: 'link-kakao' };

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, Kakao, LinkGoogle, LinkKakao],
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

      const linkProvider = parseLinkProviderId(account.provider);

      if (linkProvider) {
        // 계정 연동 콜백이다 — 로그인 경로(백엔드 세션 교체)를 타지 않는다. 이때
        // 인자 token은 기존 세션이 아니라 Auth.js가 프로바이더 프로필로 새로 만든
        // 토큰이므로, 기존 세션 클레임은 세션 쿠키를 직접 복호화해 복원한다.
        // 결과는 쿠키로 마이 페이지에 전달한다.
        const restored = await restoreSessionClaims();

        if (!restored?.userId) {
          // 로그인된 세션 없이 연동 콜백에 도달했다. throw로 signIn을 실패시켜
          // 사용자 귀속이 없는 세션이 발급되는 것을 막는다.
          throw new Error('연동은 로그인된 세션에서만 진행할 수 있습니다.');
        }

        if (!account.id_token) {
          throw new Error(`${account.provider} 응답에 id_token이 없습니다.`);
        }

        await processLinkCallback(linkProvider, account.id_token);

        // 새로 만들어진 token을 버리고 복원한 클레임을 반환해 세션을 그대로 잇는다.
        return restored;
      }

      if (!isSocialLoginProvider(account.provider)) {
        throw new Error(
          `지원하지 않는 로그인 provider입니다: ${account.provider}`,
        );
      }

      if (!account.id_token) {
        throw new Error(`${account.provider} 응답에 id_token이 없습니다.`);
      }

      // 백엔드 로그인 실패는 여기서 던져 NextAuth 로그인 자체를 실패시킨다.
      // "NextAuth 세션만 있고 백엔드 세션은 없는" 반쪽 상태를 만들지 않는다.
      const profile = await establishBackendSession(
        account.provider,
        account.id_token,
      );

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
