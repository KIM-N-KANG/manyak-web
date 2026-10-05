import {
  SocialAuthResponseStatus,
  type TokenResponse,
  type UserConsentRequest,
} from '@/api/generated/models';
import { API_ERROR_CODE } from '@/constants/api-error-code';
import { readAmplitudeDeviceIdOnServer } from '@/observability/analytics/identity-server';

import {
  BackendAuthError,
  completeSocialAuthOnServer,
  fetchMeOnServer,
  parseBackendErrorCode,
  startSocialAuthOnServer,
} from './backend-client';
import { readHandoffCodeOnServer } from './handoff-cookie';
import { refreshWithDedup } from './refresh-dedup';
import {
  SIGNUP_CONSENT_ERROR,
  type SignupConsentErrorCode,
} from './signup-consent';
import {
  clearPendingSignupConsent,
  readPendingSignupConsent,
  toPendingSignupConsent,
  writePendingSignupConsent,
} from './signup-consent-cookie';
import type { SocialLoginProvider } from './social-provider';
import { shouldRefreshAccessToken } from './token-cookie-policy';
import {
  clearBackendSession,
  hasNextAuthSessionCookie,
  readBackendSessionTokens,
  readRefreshTokenCookie,
  writeBackendSessionTokens,
} from './token-cookies';

/**
 * ensureFreshAccessToken 결과. 프록시가 게스트(익명 통과)와 세션 만료(능동 로그아웃
 * 신호 필요)를 구분할 수 있도록 판별 유니온으로 표현한다.
 */
export type FreshAccessTokenResult =
  | { status: 'authenticated'; accessToken: string }
  | { status: 'guest' } // 처음부터 토큰 없음
  | { status: 'expired' } // 회원이었으나 리프레시가 4xx로 확정 거절됨 → 세션 폐기 완료
  | { status: 'degraded' }; // 회원인데 일시 실패로 이번 요청의 토큰을 확보하지 못함 → 세션 보존

/**
 * 재발급 실패가 백엔드의 확정 거절(4xx)인지 판별한다. 재사용 탐지로 refresh family가
 * 폐기된 경우 등 재시도해도 소용없는 실패만 능동 로그아웃 대상으로 삼는다. 네트워크
 * 오류·5xx는 회복 가능한 일시 실패이므로 세션을 보존한다.
 *
 * @param error 재발급 과정에서 잡힌 에러
 * @returns 4xx 확정 거절이면 true
 */
function isConfirmedAuthRejection(error: unknown): boolean {
  return (
    error instanceof BackendAuthError &&
    error.status >= 400 &&
    error.status < 500
  );
}

/**
 * 백엔드 요청 전에 유효한 access 토큰을 확보한다(스펙 §3-8 선제 재발급).
 *
 * 세션의 실제 자격증명은 refresh 토큰이고 access 토큰은 캐시다. 그래서 access·expiresAt이
 * 없거나 손상돼도 refresh 토큰만 살아 있으면 재발급으로 로그인을 복구한다.
 *
 * - 유효한 access 토큰이 있고 만료 임박도 아니면 그대로 사용
 * - 그 외(만료 임박·access 없음·손상)에는 refresh 토큰으로 재발급
 *   - 성공 → 새 토큰으로 인증
 *   - 4xx 확정 거절 → 세션 폐기 후 expired(능동 로그아웃)
 *   - 일시 실패(네트워크·5xx) → 세션 보존, 기존 access 토큰이 있으면 best-effort로
 *     인증, 없으면 degraded(회원의 요청을 익명으로 흘리지 않도록 게스트와 구분)
 * - refresh 토큰이 없으면 복구 불가: NextAuth 세션 쿠키가 남아 있으면(불일치) 폐기 후
 *   expired, 아니면 guest
 *
 * `forceRefresh`는 백엔드가 만료 전 access 토큰을 401로 거절했을 때(다른 기기 탈퇴·
 * 로그아웃으로 family 폐기, 서버 키 회전 등) 만료 임박 판정을 건너뛰고 바로 재발급한다.
 * 재발급 중복 방지 캐시가 그대로 적용되므로 직전에 발급된 토큰이 다시 거절돼도
 * 같은 결과를 돌려줄 뿐 refresh 토큰을 두 번 회전시키지 않는다.
 *
 * @param nowMs 현재 시각(ms epoch)
 * @param options 재발급 옵션. `forceRefresh`가 true면 유효해 보이는 access 토큰이 있어도 재발급한다
 * @returns access 토큰 확보 결과(판별 유니온)
 */
export async function ensureFreshAccessToken(
  nowMs = Date.now(),
  options: { forceRefresh?: boolean } = {},
): Promise<FreshAccessTokenResult> {
  const tokens = await readBackendSessionTokens();

  if (
    tokens &&
    !options.forceRefresh &&
    !shouldRefreshAccessToken(tokens.expiresAt, nowMs)
  ) {
    return { status: 'authenticated', accessToken: tokens.accessToken };
  }

  const refreshToken = tokens?.refreshToken ?? (await readRefreshTokenCookie());

  if (!refreshToken) {
    // refresh 토큰이 없어 복구할 수 없다. NextAuth 세션 쿠키만 남아 있으면 "화면은
    // 회원, 서버엔 열쇠 없음"인 불일치 상태이므로(쿠키 손상·수동 삭제 등) 세션을
    // 정리하고 능동 로그아웃을 신호한다. 그마저 없으면 순수 게스트다.
    if (await hasNextAuthSessionCookie()) {
      await clearBackendSession();

      return { status: 'expired' };
    }

    return { status: 'guest' };
  }

  try {
    const refreshed = await refreshWithDedup(refreshToken);

    await writeBackendSessionTokens(refreshed, nowMs);

    // writeBackendSessionTokens가 accessToken 없으면 throw하므로 여기선 항상 존재한다.
    return {
      status: 'authenticated',
      accessToken: refreshed.accessToken ?? '',
    };
  } catch (error) {
    if (isConfirmedAuthRejection(error)) {
      await clearBackendSession();

      return { status: 'expired' };
    }

    // 일시 실패: 세션을 보존한다. 기존 access 토큰이 있으면 best-effort로 통과시키고,
    // 없으면 degraded로 신호한다(다음 요청에서 재발급 재시도). 여기서 guest로 처리하면
    // 회원의 변경 요청이 익명으로 백엔드에 전달돼 게스트 콘텐츠로 잘못 귀속된다.
    if (tokens) {
      return { status: 'authenticated', accessToken: tokens.accessToken };
    }

    return { status: 'degraded' };
  }
}

/** 세션에 담을 백엔드 회원 프로필. */
export type BackendProfile = {
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  isNewUser: boolean;
};

/**
 * 발급받은 토큰으로 백엔드 세션을 수립하고 세션에 담을 프로필을 반환한다.
 *
 * 검증 후 쓰기: BFF 세션 쿠키(writeBackendSessionTokens)는 토큰·사용자 정보 검증을
 * 모두 통과한 마지막 단계에서만 기록한다. 검증 전에 먼저 쓰면, 이후 단계(사용자
 * 조회 등)가 실패해 NextAuth 로그인이 거부되더라도 BFF 쿠키는 이미 기록된 채로
 * 남아 "반쪽 세션"(게스트로 보이는 UI + 프록시의 Authorization 주입이 최대 14일
 * 지속)이 발생할 수 있다. 공유 기기에서는 다음 게스트의 활동이 실패한 계정에
 * 귀속되는 문제로 이어진다.
 *
 * @param tokens 소셜 인증 또는 가입 완료가 발급한 토큰 응답
 * @returns 세션에 담을 사용자 프로필
 * @throws 토큰 응답에 accessToken이 없거나 사용자 정보에 id가 없으면 에러
 */
async function establishSessionFromTokens(
  tokens: TokenResponse,
): Promise<BackendProfile> {
  if (!tokens.accessToken) {
    throw new Error('토큰 응답에 accessToken이 없습니다.');
  }

  const me = await fetchMeOnServer(tokens.accessToken);

  if (!me.id) {
    throw new Error('사용자 정보 응답에 id가 없습니다.');
  }

  await writeBackendSessionTokens(tokens, Date.now());

  return {
    userId: me.id,
    nickname: me.nickname ?? '',
    profileImageUrl: me.profileImageUrl ?? null,
    isNewUser: tokens.isNewUser === true,
  };
}

/** 소셜 인증 결과. 동의가 남았으면 세션 없이 대기 쿠키만 남긴다. */
export type SocialLoginResult =
  | { status: 'completed'; profile: BackendProfile }
  | { status: 'consent-required' };

/**
 * 소셜 provider의 id_token으로 소셜 인증을 하고, 현행 필수 동의가 모두 있으면 백엔드
 * 세션을 수립한다. 동의가 남았으면 세션을 만들지 않고 대기 코드를 HttpOnly 쿠키에 담는다.
 * NextAuth signIn 콜백(최초 로그인)에서 호출한다. 실패 시 던져서 로그인 자체를 실패시킨다.
 *
 * @param provider 로그인에 사용한 소셜 provider
 * @param idToken provider에서 발급한 OIDC ID 토큰
 * @returns 완료 프로필 또는 동의 대기
 * @throws 응답을 해석할 수 없거나 세션 수립이 실패하면 에러
 */
export async function authenticateSocialLogin(
  provider: SocialLoginProvider,
  idToken: string,
): Promise<SocialLoginResult> {
  // OAuth 콜백은 내비게이션 요청이라 분석 헤더가 없으므로 쿠키에서 device_id를 읽어
  // 소셜 인증 요청에 싣는다. 가입 시 게스트 체험 사용량을 회원 카운터로 시드하는 데
  // 쓰이며(스펙 §4-3-7), 빠뜨리면 백엔드가 한도 소진 폴백으로 시드해 신규 가입자의
  // 무료 체험이 0이 된다(1회성 시드라 비가역).
  const deviceId = await readAmplitudeDeviceIdOnServer();
  // 외부 랜딩이 심은 핸드오프 쿠키를 읽는다. 서버가 대기 코드에 함께 보관해 로그인이
  // 완료되는 시점에 시드와 이관을 수행한다(스펙 §4-3-5). 코드는 비밀값이라 로그·분석에
  // 남기지 않는다.
  const handoffCode = await readHandoffCodeOnServer();
  const response = await startSocialAuthOnServer(
    provider,
    idToken,
    deviceId,
    handoffCode,
  );

  if (response.status === SocialAuthResponseStatus.COMPLETED) {
    if (!response.token) {
      throw new Error('소셜 인증 응답에 토큰이 없습니다.');
    }

    const profile = await establishSessionFromTokens(response.token);

    // 이 브라우저에서 끝내지 않은 이전 가입 대기가 새 로그인 뒤에 시트를 띄우지 않게 한다.
    await clearPendingSignupConsent();

    return { status: 'completed', profile };
  }

  const pending =
    response.status === SocialAuthResponseStatus.CONSENT_REQUIRED
      ? toPendingSignupConsent(response)
      : null;

  if (!pending) {
    throw new Error('소셜 인증 응답을 해석하지 못했습니다.');
  }

  await writePendingSignupConsent(pending);

  return { status: 'consent-required' };
}

/** 가입 동의 완료 결과. 실패는 시트가 처리를 고를 code로 돌려준다. */
export type SignupConsentResult =
  | { ok: true; profile: BackendProfile }
  | { ok: false; code: SignupConsentErrorCode };

/**
 * 완료 API 실패를 가입 동의 실패 코드로 분류한다. 401은 대기 코드 없음·만료·소비,
 * 버전 불일치와 필수 항목 누락은 약관 개정으로 다시 로그인해야 하는 경우다.
 *
 * @param error 완료 API 호출에서 잡힌 에러
 * @returns 가입 동의 실패 코드
 */
function classifyCompleteError(error: unknown): SignupConsentErrorCode {
  if (error instanceof BackendAuthError && error.status === 401) {
    return SIGNUP_CONSENT_ERROR.EXPIRED;
  }

  const code = parseBackendErrorCode(error);

  return code === API_ERROR_CODE.CONSENT_VERSION_MISMATCH ||
    code === API_ERROR_CODE.CONSENT_REQUIRED_MISSING
    ? SIGNUP_CONSENT_ERROR.OUTDATED
    : SIGNUP_CONSENT_ERROR.RETRYABLE;
}

/**
 * 대기 쿠키의 대기 코드로 가입(또는 재동의 로그인)을 완료하고 백엔드 세션을 수립한다.
 * 가입 동의 Credentials 프로바이더의 authorize에서 호출한다. 다시 로그인해야 하는
 * 실패(만료, 약관 개정)는 대기 쿠키를 지우고, 일시 실패는 재제출할 수 있게 남긴다.
 *
 * @param consents 사용자가 동의한 필수 항목과 버전
 * @returns 완료 프로필 또는 실패 code
 */
export async function completeSignupConsent(
  consents: UserConsentRequest,
): Promise<SignupConsentResult> {
  const pending = await readPendingSignupConsent();

  if (!pending) {
    return { ok: false, code: SIGNUP_CONSENT_ERROR.EXPIRED };
  }

  let tokens: TokenResponse;

  try {
    tokens = await completeSocialAuthOnServer(
      pending.consentToken,
      consents,
      await readAmplitudeDeviceIdOnServer(),
    );
  } catch (error) {
    const code = classifyCompleteError(error);

    if (code !== SIGNUP_CONSENT_ERROR.RETRYABLE) {
      await clearPendingSignupConsent();
    }

    return { ok: false, code };
  }

  try {
    const profile = await establishSessionFromTokens(tokens);

    await clearPendingSignupConsent();

    return { ok: true, profile };
  } catch {
    // 서버는 대기 코드를 이미 소비했다. 재제출은 401 expired로 이어지고, 다시 로그인하면
    // 동의가 저장돼 있으므로 COMPLETED로 끝난다.
    return { ok: false, code: SIGNUP_CONSENT_ERROR.RETRYABLE };
  }
}
