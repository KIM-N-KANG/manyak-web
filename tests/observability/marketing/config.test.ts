import { describe, expect, it } from 'vitest';

import { resolveMetaPixelEnabled } from '@/observability/marketing/config';

describe('resolveMetaPixelEnabled', () => {
  it('픽셀 ID가 있고 production이면 true', () => {
    expect(
      resolveMetaPixelEnabled({
        pixelId: '838489259195165',
        nodeEnv: 'production',
      }),
    ).toBe(true);
  });

  it('픽셀 ID가 없으면 production이어도 false', () => {
    expect(
      resolveMetaPixelEnabled({ pixelId: undefined, nodeEnv: 'production' }),
    ).toBe(false);
    expect(
      resolveMetaPixelEnabled({ pixelId: '', nodeEnv: 'production' }),
    ).toBe(false);
  });

  it('픽셀 ID가 있어도 production이 아니면 false', () => {
    expect(
      resolveMetaPixelEnabled({
        pixelId: '838489259195165',
        nodeEnv: 'development',
      }),
    ).toBe(false);
    expect(
      resolveMetaPixelEnabled({ pixelId: '838489259195165', nodeEnv: 'test' }),
    ).toBe(false);
  });
});
