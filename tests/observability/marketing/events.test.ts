import { describe, expect, it } from 'vitest';

import { isStandardMetaPixelEvent } from '@/observability/marketing/events';

describe('isStandardMetaPixelEvent', () => {
  it('PageView·StartTrial은 Meta 표준 이벤트다', () => {
    expect(isStandardMetaPixelEvent('PageView')).toBe(true);
    expect(isStandardMetaPixelEvent('StartTrial')).toBe(true);
  });

  it('StorylinesGenerated·StoryCompiled는 맞춤 이벤트다', () => {
    expect(isStandardMetaPixelEvent('StorylinesGenerated')).toBe(false);
    expect(isStandardMetaPixelEvent('StoryCompiled')).toBe(false);
  });
});
