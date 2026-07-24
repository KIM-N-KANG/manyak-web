import { readAmplitudeDeviceIdOnServer } from '@/observability/analytics/identity-server';

import {
  BackendAuthError,
  fetchMeOnServer,
  loginWithGoogleOnServer,
} from './backend-client';
import { refreshWithDedup } from './refresh-dedup';
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
 * @param nowMs 현재 시각(ms epoch)
 * @returns access 토큰 확보 결과(판별 유니온)
 */
export async function ensureFreshAccessToken(
  nowMs = Date.now(),
): Promise<FreshAccessTokenResult> {
  const tokens = await readBackendSessionTokens();

  if (tokens && !shouldRefreshAccessToken(tokens.expiresAt, nowMs)) {
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

/**
 * Google id_token으로 백엔드 세션을 수립하고 세션에 담을 프로필을 반환한다.
 * NextAuth jwt 콜백(최초 로그인)에서 호출한다. 실패 시 던져서 로그인 자체를 실패시킨다.
 *
 * 검증 후 쓰기: BFF 세션 쿠키(writeBackendSessionTokens)는 토큰·사용자 정보 검증을
 * 모두 통과한 마지막 단계에서만 기록한다. 검증 전에 먼저 쓰면, 이후 단계(사용자
 * 조회 등)가 실패해 NextAuth 로그인이 거부되더라도 BFF 쿠키는 이미 기록된 채로
 * 남아 "반쪽 세션"(게스트로 보이는 UI + 프록시의 Authorization 주입이 최대 14일
 * 지속)이 발생할 수 있다. 공유 기기에서는 다음 게스트의 활동이 실패한 계정에
 * 귀속되는 문제로 이어진다.
 *
 * @param idToken Google에서 발급한 ID 토큰
 * @returns 세션에 담을 사용자 프로필(userId, nickname, profileImageUrl, isNewUser)
 * @throws 토큰 응답에 accessToken이 없거나 사용자 정보에 id가 없으면 에러
 */
export async function establishBackendSession(idToken: string): Promise<{
  userId: string;
  nickname: string;
  profileImageUrl: string | null;
  isNewUser: boolean;
}> {
  // OAuth 콜백은 내비게이션 요청이라 분석 헤더가 없으므로 쿠키에서 device_id를 읽어
  // 로그인 요청에 싣는다. 가입 시 게스트 체험 사용량을 회원 카운터로 시드하는 데
  // 쓰이며(스펙 §4-3-7), 빠뜨리면 백엔드가 한도 소진 폴백으로 시드해 신규 가입자의
  // 무료 체험이 0이 된다(1회성 시드라 비가역).
  const deviceId = await readAmplitudeDeviceIdOnServer();

  const tokens = await loginWithGoogleOnServer(idToken, deviceId);

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
