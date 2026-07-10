/** 이 거리 이내로 최상단에 가까우면 헤더를 항상 표시한다. */
const TOP_EDGE_THRESHOLD_PX = 8;
/** 이 정도 이상 스크롤해야 방향(표시/숨김)을 전환한다. 미세한 흔들림 무시. */
const SCROLL_DELTA_THRESHOLD_PX = 4;

/**
 * 스크롤 위치·이동량으로 헤더 표시 여부를 결정합니다. 변화가 미미하면 `null`(현 상태 유지).
 *
 * 방향 판정은 사용자 스크롤에만 적용합니다. MessageScroller가 전송 직후 새 메시지를
 * 최상단에 앵커링할 때 점프·보정 스크롤(음수 delta 포함)이 연쇄로 발생하는데,
 * 이를 사용자 스크롤로 오인하면 숨겨둔 헤더가 다시 내려옵니다.
 */
export function resolveHeaderVisibility(
  scrollTop: number,
  delta: number,
  isUserScroll: boolean,
): boolean | null {
  if (scrollTop <= TOP_EDGE_THRESHOLD_PX) return true;

  if (!isUserScroll) return null;

  if (delta > SCROLL_DELTA_THRESHOLD_PX) return false;

  if (delta < -SCROLL_DELTA_THRESHOLD_PX) return true;

  return null;
}
