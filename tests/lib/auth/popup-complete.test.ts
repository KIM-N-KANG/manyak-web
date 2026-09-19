import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  readBackendSessionTokens: vi.fn(),
}));

vi.mock('@/lib/auth/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/auth/token-cookies', () => ({
  readBackendSessionTokens: mocks.readBackendSessionTokens,
}));

import { GET } from '@/app/api/auth/popup-complete/route';
import { POPUP_LOGIN_COPY } from '@/lib/auth/popup-login';

const attempt = '24130b19-4d5e-4b5c-9766-2d1704904e11';

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue({ user: { id: 'private-user-id' } });
  mocks.readBackendSessionTokens.mockReset().mockResolvedValue({
    accessToken: 'secret-access',
    refreshToken: 'secret-refresh',
    expiresAt: Date.now() + 60_000,
  });
});

describe('팝업 인증 완료 응답', () => {
  it('인증 결과만 전달하고 토큰과 회원 식별자를 노출하지 않는다', async () => {
    const response = await GET(
      new Request(
        `https://manyak.example/api/auth/popup-complete?attempt=${attempt}`,
      ),
    );
    const body = await response.text();

    expect(body).toContain('"authenticated":true');
    expect(body).toContain('window.location.origin');
    expect(body).toContain(POPUP_LOGIN_COPY.complete);
    expect(body).not.toMatch(/secret-access|secret-refresh|private-user-id/);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "frame-ancestors 'none'",
    );
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('Auth.js 세션만 있고 백엔드 쿠키가 없으면 실패를 알린다', async () => {
    mocks.readBackendSessionTokens.mockResolvedValue(null);

    const response = await GET(
      new Request(
        `https://manyak.example/api/auth/popup-complete?attempt=${attempt}`,
      ),
    );

    expect(await response.text()).toContain('"authenticated":false');
  });

  it('유효하지 않은 시도 식별자는 HTML에 삽입하지 않는다', async () => {
    const response = await GET(
      new Request(
        'https://manyak.example/api/auth/popup-complete?attempt=%3Cscript%3E',
      ),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('');
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});
