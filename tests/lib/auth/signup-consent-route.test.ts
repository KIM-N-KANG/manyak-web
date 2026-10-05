import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readPendingSignupConsent: vi.fn(),
  clearPendingSignupConsent: vi.fn(),
}));

vi.mock('@/lib/auth/signup-consent-cookie', () => mocks);

import { DELETE, GET } from '@/app/api/auth/signup-consent/route';

const CONSENTS = { terms: { requiredVersion: 'v1.2', needsConsent: true } };

beforeEach(() => {
  mocks.readPendingSignupConsent.mockReset().mockResolvedValue(null);
  mocks.clearPendingSignupConsent.mockReset();
});

describe('가입 동의 대기 BFF 라우트', () => {
  it('대기 중이면 동의 상태와 만료 시각만 돌려주고 대기 코드는 내보내지 않는다', async () => {
    mocks.readPendingSignupConsent.mockResolvedValue({
      consentToken: 'secret-pending-code',
      expiresAt: '2026-10-05T00:10:00Z',
      consents: CONSENTS,
    });

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toEqual({
      consents: CONSENTS,
      expiresAt: '2026-10-05T00:10:00Z',
    });
    expect(body).not.toContain('secret-pending-code');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('대기가 없으면 404다', async () => {
    const response = await GET();

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('DELETE는 대기 쿠키를 지우고 204다', async () => {
    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(mocks.clearPendingSignupConsent).toHaveBeenCalledOnce();
  });
});
