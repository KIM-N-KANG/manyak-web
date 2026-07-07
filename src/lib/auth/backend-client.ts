import type { MeResponse, TokenResponse } from '@/api/generated/models';

/**
 * BFF(서버)에서 백엔드 인증 API를 직접 호출하는 클라이언트.
 * Orval 생성 훅은 브라우저 → 동일 출처 프록시(/api) 경유가 전제라 서버 내부 호출에는 쓸 수 없다.
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

const resolveApiBaseUrl = (): string => {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not configured.');
  }

  return apiBaseUrl.replace(/\/+$/, '');
};

const requestBackend = async <T>(
  path: string,
  init: RequestInit,
): Promise<T> => {
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
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

const postJson = <T>(path: string, body: unknown): Promise<T> =>
  requestBackend<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Google ID 토큰으로 로그인해 백엔드 토큰 쌍을 발급받는다. */
export const loginWithGoogleOnServer = (
  idToken: string,
): Promise<TokenResponse> =>
  postJson<TokenResponse>('/api/v1/auth/login/google', { idToken });

/** refresh 토큰을 회전해 새 토큰 쌍을 발급받는다. 실패(401)는 family 폐기를 뜻할 수 있다. */
export const refreshOnServer = (refreshToken: string): Promise<TokenResponse> =>
  postJson<TokenResponse>('/api/v1/auth/token/refresh', { refreshToken });

/** refresh 토큰을 폐기한다(멱등 — 이미 폐기된 토큰도 204). */
export const logoutOnServer = (refreshToken: string): Promise<void> =>
  postJson<void>('/api/v1/auth/logout', { refreshToken });

/** access 토큰으로 현재 사용자 프로필을 조회한다. */
export const fetchMeOnServer = (accessToken: string): Promise<MeResponse> =>
  requestBackend<MeResponse>('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
