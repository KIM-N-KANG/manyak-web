import {
  getLoginWithGoogleUrl,
  getLogoutUrl,
  getMeUrl,
  getRefreshUrl,
} from '@/api/generated/endpoints/auth/auth';
import type { MeResponse, TokenResponse } from '@/api/generated/models';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

/**
 * BFF(서버)에서 백엔드 인증 API를 직접 호출하는 클라이언트.
 * Orval 생성 훅/함수는 브라우저 → 동일 출처 프록시(/api) 경유가 전제라(customInstance가
 * URL을 상대경로 /api로 바꾸고 세션 토큰을 프록시가 주입) 서버 내부 호출에는 쓸 수 없다.
 * 다만 경로 문자열은 생성된 URL 빌더를 재사용해 백엔드 스펙과의 드리프트를 막는다.
 */
export class BackendAuthError extends Error {
  constructor(
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(
      `백엔드 인증 요청이 실패했습니다 (${status})${body ? `: ${body}` : ''}`,
    );
    this.name = 'BackendAuthError';
  }
}

/**
 * 백엔드 API 베이스 URL을 환경 변수에서 읽어 끝의 슬래시를 제거해 반환한다.
 *
 * @returns 정규화된 백엔드 베이스 URL
 * @throws API_BASE_URL이 설정돼 있지 않으면 에러
 */
const resolveApiBaseUrl = (): string => {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not configured.');
  }

  return apiBaseUrl.replace(/\/+$/, '');
};

/**
 * 백엔드 API를 호출하고 응답 본문을 파싱해 반환한다. 204는 undefined로 처리한다.
 *
 * @param path 백엔드 API 경로(생성된 URL 빌더로 만든 값)
 * @param init fetch 요청 옵션
 * @returns 파싱된 응답 본문
 * @throws 응답이 ok가 아니면 BackendAuthError
 */
const requestBackend = async <T>(
  path: string,
  init: RequestInit,
): Promise<T> => {
  const response = await fetchWithTimeout(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');

    throw new BackendAuthError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

/**
 * JSON 본문을 담아 백엔드에 POST 요청을 보낸다.
 *
 * @param path 백엔드 API 경로
 * @param body JSON으로 직렬화할 요청 본문
 * @returns 파싱된 응답 본문
 */
const postJson = <T>(path: string, body: unknown): Promise<T> =>
  requestBackend<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/**
 * Google ID 토큰으로 로그인해 백엔드 토큰 쌍을 발급받는다.
 *
 * @param idToken Google에서 발급한 ID 토큰
 * @returns 발급된 백엔드 토큰 응답
 */
export const loginWithGoogleOnServer = (
  idToken: string,
): Promise<TokenResponse> =>
  postJson<TokenResponse>(getLoginWithGoogleUrl(), { idToken });

/**
 * refresh 토큰을 회전해 새 토큰 쌍을 발급받는다. 실패(401)는 family 폐기를 뜻할 수 있다.
 *
 * @param refreshToken 회전할 refresh 토큰
 * @returns 새로 발급된 백엔드 토큰 응답
 */
export const refreshOnServer = (refreshToken: string): Promise<TokenResponse> =>
  postJson<TokenResponse>(getRefreshUrl(), { refreshToken });

/**
 * refresh 토큰을 폐기한다(멱등 — 이미 폐기된 토큰도 204).
 *
 * @param refreshToken 폐기할 refresh 토큰
 */
export const logoutOnServer = (refreshToken: string): Promise<void> =>
  postJson<void>(getLogoutUrl(), { refreshToken });

/**
 * access 토큰으로 현재 사용자 프로필을 조회한다.
 *
 * @param accessToken 인증에 사용할 access 토큰
 * @returns 현재 사용자 프로필 응답
 */
export const fetchMeOnServer = (accessToken: string): Promise<MeResponse> =>
  requestBackend<MeResponse>(getMeUrl(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
