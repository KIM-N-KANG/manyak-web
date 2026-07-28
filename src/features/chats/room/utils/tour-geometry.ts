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
 * 카드가 뷰포트를 벗어나지 않도록 왼쪽 좌표를 클램프한다.
 *
 * @param rectCenterX 하이라이트 영역의 가로 중심 좌표
 * @param cardWidth 카드 너비
 * @param viewportWidth 뷰포트 너비
 * @param margin 뷰포트 좌우 최소 여백
 * @returns 클램프된 카드의 왼쪽 좌표
 */
export function clampTourCardLeft(
  rectCenterX: number,
  cardWidth: number,
  viewportWidth: number,
  margin: number,
): number {
  const ideal = rectCenterX - cardWidth / 2;
  const max = Math.max(viewportWidth - cardWidth - margin, margin);

  return Math.min(Math.max(ideal, margin), max);
}
