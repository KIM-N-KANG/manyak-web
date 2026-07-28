import { describe, expect, it } from 'vitest';

import {
  clampTourCardLeft,
  padTourRect,
  resolveTourCardSide,
  unionTourRects,
} from '@/features/chats/room/utils/tour-geometry';

describe('unionTourRects', () => {
  it('빈 목록이면 null을 반환한다', () => {
    expect(unionTourRects([])).toBeNull();
  });

  it('여러 영역을 감싸는 최소 사각형을 구한다', () => {
    expect(
      unionTourRects([
        { top: 10, left: 10, width: 20, height: 10 },
        { top: 30, left: 40, width: 10, height: 20 },
      ]),
    ).toEqual({ top: 10, left: 10, width: 40, height: 40 });
  });
});

describe('padTourRect', () => {
  it('사방으로 여백을 더한다', () => {
    expect(
      padTourRect({ top: 10, left: 10, width: 20, height: 20 }, 6),
    ).toEqual({ top: 4, left: 4, width: 32, height: 32 });
  });
});

describe('resolveTourCardSide', () => {
  it('하이라이트 아래 공간이 충분하면 bottom을 반환한다', () => {
    expect(
      resolveTourCardSide(
        { top: 0, left: 0, width: 100, height: 100 },
        800,
        160,
        12,
      ),
    ).toBe('bottom');
  });

  it('아래 공간이 부족하면 top을 반환한다', () => {
    expect(
      resolveTourCardSide(
        { top: 600, left: 0, width: 100, height: 150 },
        800,
        160,
        12,
      ),
    ).toBe('top');
  });
});

describe('clampTourCardLeft', () => {
  it('공간이 충분하면 하이라이트 중앙에 정렬한다', () => {
    expect(clampTourCardLeft(400, 288, 800, 16)).toBe(256);
  });

  it('뷰포트 좌우 경계 안으로 클램프한다', () => {
    expect(clampTourCardLeft(0, 288, 800, 16)).toBe(16);
    expect(clampTourCardLeft(800, 288, 800, 16)).toBe(800 - 288 - 16);
  });
});
