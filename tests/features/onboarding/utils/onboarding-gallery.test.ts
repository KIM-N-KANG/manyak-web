import { describe, expect, it } from 'vitest';

import {
  getGalleryPosition,
  getSlideMotionStyle,
} from '@/features/onboarding/utils/onboarding-gallery';

describe('getGalleryPosition', () => {
  it('카드 사이 구간의 앞뒤 일부는 카드가 가운데에 멈춰 있다', () => {
    expect(getGalleryPosition(0, 5)).toBe(0);
    expect(getGalleryPosition(0.04, 5)).toBe(0);
    expect(getGalleryPosition(0.25, 5)).toBe(1);
    expect(getGalleryPosition(0.29, 5)).toBe(1);
    expect(getGalleryPosition(1, 5)).toBe(4);
  });

  it('구간 가운데에서는 두 카드 사이를 부드럽게 지난다', () => {
    expect(getGalleryPosition(0.125, 5)).toBeCloseTo(0.5);

    const early = getGalleryPosition(0.08, 5);
    const late = getGalleryPosition(0.17, 5);

    expect(early).toBeGreaterThan(0);
    expect(late).toBeLessThan(1);
    expect(late).toBeGreaterThan(early);
  });

  it('범위 밖 진행률과 카드 한 장은 끝에 붙는다', () => {
    expect(getGalleryPosition(-0.3, 5)).toBe(0);
    expect(getGalleryPosition(1.4, 5)).toBe(4);
    expect(getGalleryPosition(0.6, 1)).toBe(0);
  });
});

describe('getSlideMotionStyle', () => {
  it('가로 갤러리는 옆 카드를 흐리게 하되 캡션은 카드와 함께 보인다', () => {
    const current = getSlideMotionStyle('gallery', 0);
    const next = getSlideMotionStyle('gallery', 1);

    expect(current.opacity).toBe(1);
    expect(next.opacity).toBeCloseTo(0.4);
    expect(next.captionOpacity).toBe(1);
    expect(next.transform).toContain('1 * (var(--slide-width)');
  });

  it('카드 덱은 지나간 카드가 왼쪽으로 날아가 사라지고 뒤 카드 캡션은 숨긴다', () => {
    const passed = getSlideMotionStyle('deck', -1);
    const behind = getSlideMotionStyle('deck', 1);

    expect(passed.opacity).toBe(0);
    expect(passed.transform).toContain('translate(-115%');
    expect(behind.opacity).toBe(1);
    expect(behind.captionOpacity).toBe(0);
  });

  it('쌓이기는 다음 카드가 갤러리 칸 아래에서 불투명하게 올라오고 지나간 카드는 흐려진다', () => {
    const waiting = getSlideMotionStyle('stack', 1);

    expect(waiting.opacity).toBe(1);
    expect(waiting.captionOpacity).toBe(0);
    expect(waiting.transform).toContain('calc(1 * (100% + 2rem))');
    expect(getSlideMotionStyle('stack', -1).opacity).toBeCloseTo(0.55);
  });
});
