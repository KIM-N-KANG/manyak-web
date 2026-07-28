import { describe, expect, it } from 'vitest';

import {
  isTourRectInViewport,
  padTourRect,
  resolveTourCardLeft,
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

describe('isTourRectInViewport', () => {
  it('화면 안에 걸쳐 있으면 true를 반환한다', () => {
    expect(
      isTourRectInViewport({ top: 100, left: 0, width: 100, height: 50 }, 800),
    ).toBe(true);
    expect(
      isTourRectInViewport({ top: -20, left: 0, width: 100, height: 50 }, 800),
    ).toBe(true);
  });

  it('스크롤 밖으로 완전히 벗어나면 false를 반환한다', () => {
    expect(
      isTourRectInViewport({ top: 900, left: 0, width: 100, height: 50 }, 800),
    ).toBe(false);
    expect(
      isTourRectInViewport({ top: -80, left: 0, width: 100, height: 50 }, 800),
    ).toBe(false);
  });
});

describe('resolveTourCardLeft', () => {
  const mobileFrame = { left: 0, right: 393 };

  it('공간이 충분하면 하이라이트 중앙에 정렬한다', () => {
    expect(
      resolveTourCardLeft(
        { top: 0, left: 100, width: 200, height: 40 },
        288,
        { left: 0, right: 800 },
        16,
      ),
    ).toBe(56);
  });

  it('왼쪽 공간이 부족하면 하이라이트 왼쪽 변에 맞춘다', () => {
    // 툴바 버튼 하이라이트(x=10)는 프레임 여백(16)보다 바깥이라, 여백에 맞추면
    // 카드가 하이라이트보다 안쪽으로 들어가 오른쪽으로 치우쳐 보인다.
    expect(
      resolveTourCardLeft(
        { top: 673, left: 10, width: 157, height: 44 },
        288,
        mobileFrame,
        16,
      ),
    ).toBe(10);
  });

  it('오른쪽 공간이 부족하면 하이라이트 오른쪽 변에 맞춘다', () => {
    expect(
      resolveTourCardLeft(
        { top: 673, left: 341, width: 42, height: 44 },
        288,
        mobileFrame,
        16,
      ),
    ).toBe(383 - 288);
  });

  it('넓은 화면에서는 뷰포트가 아니라 앱 프레임 안에 둔다', () => {
    // 1200px 뷰포트 가운데 놓인 448px(max-w-md) 앱 프레임
    const frame = { left: 376, right: 824 };
    const left = resolveTourCardLeft(
      { top: 0, left: 386, width: 157, height: 44 },
      288,
      frame,
      16,
    );

    expect(left).toBe(386);
    expect(left + 288).toBeLessThanOrEqual(frame.right);
  });

  it('프레임이 카드보다 좁아도 프레임 밖으로 나가지 않는다', () => {
    const narrow = { left: 0, right: 300 };
    const left = resolveTourCardLeft(
      { top: 0, left: 10, width: 100, height: 40 },
      288,
      narrow,
      16,
    );

    expect(left).toBeGreaterThanOrEqual(narrow.left);
    expect(left + 288).toBeLessThanOrEqual(narrow.right);
  });
});
