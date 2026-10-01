import { describe, expect, it } from 'vitest';

import {
  DRAFT_IMAGE_MAX_SIDE,
  getCropOutputSize,
} from '@/features/studio/general/utils/crop-draft-image';

describe('getCropOutputSize', () => {
  it('긴 변이 상한을 넘으면 비율을 유지해 상한에 맞춘다', () => {
    expect(getCropOutputSize({ width: 3024, height: 4032 })).toEqual({
      width: 1080,
      height: DRAFT_IMAGE_MAX_SIDE,
    });
    expect(getCropOutputSize({ width: 4032, height: 3024 })).toEqual({
      width: DRAFT_IMAGE_MAX_SIDE,
      height: 1080,
    });
  });

  it('상한보다 작은 영역은 늘리지 않는다', () => {
    expect(getCropOutputSize({ width: 600, height: 800 })).toEqual({
      width: 600,
      height: 800,
    });
  });

  it('소수 픽셀 영역은 정수로 반올림하고 1px보다 작아지지 않는다', () => {
    expect(getCropOutputSize({ width: 300.6, height: 400.4 })).toEqual({
      width: 301,
      height: 400,
    });
    expect(getCropOutputSize({ width: 0.2, height: 0.2 })).toEqual({
      width: 1,
      height: 1,
    });
  });
});
