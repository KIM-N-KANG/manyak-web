import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@amplitude/unified', () => ({
  track: vi.fn(),
  setUserId: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('@/observability/monitoring/sentry', () => ({
  recordAnalyticsBreadcrumb: vi.fn(),
}));
vi.mock('@/observability/analytics/config', () => ({
  IS_ANALYTICS_ENABLED: false,
}));

import { track } from '@/observability/analytics/client';
import {
  resetAnalyticsUser,
  setAnalyticsUser,
} from '@/observability/analytics/user-context';

const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

beforeEach(() => {
  debugSpy.mockClear();
  resetAnalyticsUser();
});

afterEach(() => {
  resetAnalyticsUser();
});

describe('track 공통 프로퍼티', () => {
  it('기본은 is_logged_in=false이고 user_id가 없다', () => {
    track('client_onboarding_viewed');

    const payload = debugSpy.mock.calls[0][2] as Record<string, unknown>;

    expect(payload.is_logged_in).toBe(false);
    expect(payload).not.toHaveProperty('user_id');
  });

  it('setAnalyticsUser 후에는 is_logged_in=true와 user_id가 붙는다', () => {
    setAnalyticsUser('user-1');
    track('client_onboarding_viewed');

    const payload = debugSpy.mock.calls[0][2] as Record<string, unknown>;

    expect(payload.is_logged_in).toBe(true);
    expect(payload.user_id).toBe('user-1');
  });

  it('resetAnalyticsUser 후에는 게스트 상태로 돌아간다', () => {
    setAnalyticsUser('user-1');
    resetAnalyticsUser();
    track('client_onboarding_viewed');

    const payload = debugSpy.mock.calls[0][2] as Record<string, unknown>;

    expect(payload.is_logged_in).toBe(false);
  });
});
