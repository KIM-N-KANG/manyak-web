import { describe, expect, it } from 'vitest';

import {
  impressionKey,
  shouldEmitImpression,
} from '@/observability/analytics/impression';

describe('impressionKey', () => {
  it('screen+object+itemId로 키를 만든다', () => {
    expect(
      impressionKey({ screen: 'storyList', object: 'storyCard', itemId: 7 }),
    ).toBe('storyList|storyCard|7');
  });
});

describe('shouldEmitImpression', () => {
  it('한 번도 발화 안 했으면 true', () => {
    expect(shouldEmitImpression(undefined, 1000)).toBe(true);
  });

  it('쿨링(30초) 이내면 false', () => {
    expect(shouldEmitImpression(1000, 1000 + 29_000)).toBe(false);
  });

  it('쿨링 경과면 true', () => {
    expect(shouldEmitImpression(1000, 1000 + 31_000)).toBe(true);
  });
});
