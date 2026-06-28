/** 이 거리 이내로 최상단에 가까우면 헤더를 항상 표시한다. */
const TOP_EDGE_THRESHOLD_PX = 8;
/** 이 정도 이상 스크롤해야 방향(표시/숨김)을 전환한다. 미세한 흔들림 무시. */
const SCROLL_DELTA_THRESHOLD_PX = 4;

/** 스크롤 위치·이동량으로 헤더 표시 여부를 결정합니다. 변화가 미미하면 `null`(현 상태 유지). */
export function resolveHeaderVisibility(
  scrollTop: number,
  delta: number,
): boolean | null {
  if (scrollTop <= TOP_EDGE_THRESHOLD_PX) return true;

  if (delta > SCROLL_DELTA_THRESHOLD_PX) return false;

  if (delta < -SCROLL_DELTA_THRESHOLD_PX) return true;

  return null;
}
