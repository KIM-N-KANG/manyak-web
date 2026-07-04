import { describe, expect, it } from 'vitest';

import { resolveAnalyticsEnabled } from '@/observability/analytics/config';

describe('resolveAnalyticsEnabled', () => {
  it('키가 있고 production이면 true', () => {
    expect(
      resolveAnalyticsEnabled({ apiKey: 'abc', nodeEnv: 'production' }),
    ).toBe(true);
  });

  it('키가 없으면 production이어도 false', () => {
    expect(
      resolveAnalyticsEnabled({ apiKey: undefined, nodeEnv: 'production' }),
    ).toBe(false);
    expect(resolveAnalyticsEnabled({ apiKey: '', nodeEnv: 'production' })).toBe(
      false,
    );
  });

  it('키가 있어도 production이 아니면 false', () => {
    expect(
      resolveAnalyticsEnabled({ apiKey: 'abc', nodeEnv: 'development' }),
    ).toBe(false);
  });
});
