import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ ensureFreshAccessToken: vi.fn() }));

vi.mock('@/lib/auth/backend-session', () => mocks);

import { POST } from '@/app/api/auth/session-refresh/route';
import { SESSION_EXPIRED_HEADER } from '@/lib/auth/session-expiry';
import { SESSION_REFRESH_GATE_SKEW_MS } from '@/lib/auth/token-cookie-policy';

beforeEach(() => {
  mocks.ensureFreshAccessToken.mockReset();
});

describe('세션 재발급 BFF 라우트', () => {
  it('게이트 여유로 재발급을 판정하고 성공하면 204다', async () => {
    mocks.ensureFreshAccessToken.mockResolvedValue({
      status: 'authenticated',
      accessToken: 'access',
    });

    const response = await POST();

    expect(response.status).toBe(204);
    expect(mocks.ensureFreshAccessToken).toHaveBeenCalledWith(
      expect.any(Number),
      { refreshSkewMs: SESSION_REFRESH_GATE_SKEW_MS },
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('게스트도 204다', async () => {
    mocks.ensureFreshAccessToken.mockResolvedValue({ status: 'guest' });

    expect((await POST()).status).toBe(204);
  });

  it('세션이 만료되면 401과 만료 헤더다', async () => {
    mocks.ensureFreshAccessToken.mockResolvedValue({ status: 'expired' });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(response.headers.get(SESSION_EXPIRED_HEADER)).toBe('1');
  });

  it('일시 실패면 503이다', async () => {
    mocks.ensureFreshAccessToken.mockResolvedValue({ status: 'degraded' });

    expect((await POST()).status).toBe(503);
  });
});
