/** 투어 하이라이트 계산에 쓰는 화면 좌표 기준 사각 영역. */
export type TourRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/**
 * 여러 대상 영역을 감싸는 최소 사각형을 구한다.
 *
 * @param rects 대상 요소들의 화면 좌표 영역
 * @returns 합집합 영역. 대상이 없으면 null
 */
export function unionTourRects(rects: TourRect[]): TourRect | null {
  if (rects.length === 0) {
    return null;
  }

  const top = Math.min(...rects.map((rect) => rect.top));
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));

  return { top, left, width: right - left, height: bottom - top };
}

/**
 * 하이라이트 영역 사방에 여백을 더한다.
 *
 * @param rect 원본 영역
 * @param padding 사방에 더할 여백(px)
 * @returns 여백이 더해진 영역
 */
export function padTourRect(rect: TourRect, padding: number): TourRect {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/**
 * 말풍선 카드를 하이라이트 위·아래 중 어디에 둘지 정한다.
 *
 * @param rect 하이라이트 영역
 * @param viewportHeight 뷰포트 높이
 * @param cardHeight 카드 높이 추정치
 * @param gap 하이라이트와 카드 사이 간격
 * @returns 아래 공간이 카드 높이와 여백에 부족하면 'top', 충분하면 'bottom'
 */
export function resolveTourCardSide(
  rect: TourRect,
  viewportHeight: number,
  cardHeight: number,
  gap: number,
): 'top' | 'bottom' {
  const spaceBelow = viewportHeight - (rect.top + rect.height);

  return spaceBelow >= cardHeight + gap * 2 ? 'bottom' : 'top';
}

/**
 * 하이라이트 영역이 화면 안에 조금이라도 보이는지 판정한다.
 * 스크롤 밖으로 밀려난 요소를 하이라이트하지 않기 위해 쓴다.
 *
 * @param rect 하이라이트 영역
 * @param viewportHeight 뷰포트 높이
 * @returns 화면과 겹치는 부분이 있으면 true
 */
export function isTourRectInViewport(
  rect: TourRect,
  viewportHeight: number,
): boolean {
  return rect.top < viewportHeight && rect.top + rect.height > 0;
}

/** 카드를 가둘 가로 경계. 앱 프레임(`max-w-md`)의 좌우 좌표를 쓴다. */
export type TourBounds = {
  left: number;
  right: number;
};

/**
 * 카드의 왼쪽 좌표를 정한다.
 * 기본은 하이라이트 중앙 정렬이고, 한쪽으로 치우쳐 중앙에 둘 수 없으면
 * 그쪽 하이라이트 변에 카드 변을 맞춘다. 여백에만 맞추면 카드가 하이라이트보다
 * 안쪽으로 들어가 어긋나 보이기 때문이다. 어느 경우든 앱 프레임은 넘지 않는다.
 *
 * @param rect 여백을 더한 하이라이트 영역
 * @param cardWidth 카드 너비
 * @param bounds 카드를 가둘 가로 경계
 * @param margin 경계 좌우 최소 여백
 * @returns 카드의 왼쪽 좌표
 */
export function resolveTourCardLeft(
  rect: TourRect,
  cardWidth: number,
  bounds: TourBounds,
  margin: number,
): number {
  const centered = rect.left + rect.width / 2 - cardWidth / 2;
  const min = bounds.left + margin;
  const max = Math.max(bounds.right - cardWidth - margin, min);

  if (centered < min) {
    return Math.max(bounds.left, Math.min(rect.left, min));
  }

  if (centered > max) {
    return Math.min(
      bounds.right - cardWidth,
      Math.max(rect.left + rect.width - cardWidth, max),
    );
  }

  return centered;
}
