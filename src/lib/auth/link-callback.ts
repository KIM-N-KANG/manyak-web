import { cookies } from 'next/headers';

import {
  BackendAuthError,
  fetchMeOnServer,
  linkAccountOnServer,
  parseBackendErrorCode,
  reauthenticateOnServer,
} from './backend-client';
import { ensureFreshAccessToken } from './backend-session';
import {
  LINK_CODE_COOKIE,
  LINK_RESULT_COOKIE,
  type LinkAccountResult,
  serializeLinkResult,
} from './link-account';
import type { SocialLoginProvider } from './social-provider';

/** 링크 코드 쿠키 수명. 백엔드 코드 TTL(5분)과 정렬한다. */
const LINK_CODE_COOKIE_MAX_AGE_SECONDS = 300;

/** 결과 쿠키 수명. 마이 페이지 복귀 직후 1회 소비되므로 짧게 둔다. */
const LINK_RESULT_COOKIE_MAX_AGE_SECONDS = 120;

const SHARED_COOKIE_OPTIONS = {
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

/**
 * 연동 플로우의 OAuth 콜백 1회를 처리한다. 재인증 단계면 링크 코드를 쿠키에 보관하고
 * (플로우가 이어지므로 결과를 남기지 않는다), 연동 단계면 연동을 실행해 결과 쿠키를
 * 남긴다. NextAuth 세션·백엔드 토큰은 건드리지 않는다(스펙 §4-5 — 연동은 새 계정도
 * 새 세션도 만들지 않는다).
 *
 * @param provider 콜백이 도착한 소셜 provider
 * @param idToken 콜백에서 받은 OIDC ID 토큰
 */
export async function processLinkCallback(
  provider: SocialLoginProvider,
  idToken: string,
): Promise<void> {
  const result = await runLinkStep(provider, idToken);

  if (result === null) {
    return;
  }

  const store = await cookies();

  // 결과 쿠키는 마이 페이지 클라이언트가 읽어야 하므로 httpOnly를 붙이지 않는다.
  // 값은 결과 코드와 provider뿐이라 비밀이 아니다(링크 코드·토큰은 싣지 않는다).
  store.set(LINK_RESULT_COOKIE, serializeLinkResult({ result, provider }), {
    ...SHARED_COOKIE_OPTIONS,
    maxAge: LINK_RESULT_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * 콜백 provider의 연동 여부로 단계를 판정해 실행한다. 클라이언트 상태가 아니라
 * `linkedProviders`로 판정하므로 중단된 이전 플로우의 잔여 쿠키에도 자기 교정된다.
 * 재인증 성공은 아직 결과가 확정되지 않았으므로 null을 반환한다.
 *
 * @param provider 콜백이 도착한 소셜 provider
 * @param idToken 콜백에서 받은 OIDC ID 토큰
 * @returns 확정된 연동 결과, 플로우가 이어지면 null
 */
async function runLinkStep(
  provider: SocialLoginProvider,
  idToken: string,
): Promise<LinkAccountResult | null> {
  try {
    const access = await ensureFreshAccessToken();

    if (access.status !== 'authenticated') {
      return 'error';
    }

    const me = await fetchMeOnServer(access.accessToken);
    const linkedProviders = me.linkedProviders ?? [];
    const store = await cookies();

    if (linkedProviders.includes(provider)) {
      // 재인증 단계다 — 링크 코드를 발급받아 연동 단계까지 httpOnly로 보관한다.
      const { linkCode } = await reauthenticateOnServer(
        access.accessToken,
        provider,
        idToken,
      );

      if (!linkCode) {
        return 'error';
      }

      store.set(LINK_CODE_COOKIE, linkCode, {
        ...SHARED_COOKIE_OPTIONS,
        httpOnly: true,
        maxAge: LINK_CODE_COOKIE_MAX_AGE_SECONDS,
      });

      return null;
    }

    // 연동 단계다 — 재인증 없이 도달했으면(코드 없음) 재인증 실패와 같게 처리한다.
    const linkCode = store.get(LINK_CODE_COOKIE)?.value;

    if (!linkCode) {
      return 'reauth_failed';
    }

    await linkAccountOnServer(access.accessToken, provider, idToken, linkCode);

    // 코드는 성공했을 때만 소비된다(스펙 §4-5). 실패 시에는 쿠키를 남겨 만료 전
    // 재인증 없는 재시도를 살린다.
    store.set(LINK_CODE_COOKIE, '', {
      ...SHARED_COOKIE_OPTIONS,
      httpOnly: true,
      expires: new Date(0),
    });

    return 'success';
  } catch (error) {
    return mapLinkError(error);
  }
}

/**
 * 연동 API 실패를 결과 코드로 변환한다. 409 2종은 안내 문구가 달라 구분한다
 * (스펙 §4-5 결정 기록 — 프론트엔드가 다르게 안내해야 한다).
 *
 * @param error 연동·재인증 호출에서 발생한 에러
 * @returns 변환된 연동 결과 코드
 */
function mapLinkError(error: unknown): LinkAccountResult {
  if (!(error instanceof BackendAuthError)) {
    return 'error';
  }

  if (error.status === 409) {
    return parseBackendErrorCode(error) ===
      'SOCIAL_ACCOUNT_LINKED_TO_OTHER_USER'
      ? 'linked_to_other_user'
      : 'provider_already_linked';
  }

  if (error.status === 403) {
    return 'reauth_failed';
  }

  return 'error';
}
