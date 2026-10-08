import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_PATH } from '@/constants/app-path';
import { fetchPendingSignupConsent } from '@/features/auth/_shared/utils/signup-consent-client';
import { SIGNUP_CONSENT_ENDPOINT } from '@/lib/auth/signup-consent';

afterEach(() => vi.unstubAllGlobals());

describe('가입 대기 조회', () => {
  it('로그인 오류 화면에서는 정리 effect 전에도 조회를 보내지 않는다', async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {
      location: new URL(
        `https://manyak.app${APP_PATH.LOGIN}?error=Configuration`,
      ),
    });

    expect(await fetchPendingSignupConsent()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([APP_PATH.LOGIN, `${APP_PATH.MAIN.STUDIO}?error=unrelated`])(
    '정상 로그인과 다른 화면의 오류 쿼리는 가입 대기를 조회한다: %s',
    async (path) => {
      const summary = { consents: {}, expiresAt: '2099-01-01T00:00:00Z' };
      const fetchMock = vi.fn().mockResolvedValue(Response.json(summary));

      vi.stubGlobal('fetch', fetchMock);
      vi.stubGlobal('window', {
        location: new URL(`https://manyak.app${path}`),
      });

      expect(await fetchPendingSignupConsent()).toEqual(summary);
      expect(fetchMock).toHaveBeenCalledWith(SIGNUP_CONSENT_ENDPOINT, {
        cache: 'no-store',
      });
    },
  );
});
