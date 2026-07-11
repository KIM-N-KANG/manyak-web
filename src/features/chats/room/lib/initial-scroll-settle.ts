export type ScrollFrame = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/** 맨 아래 판정 시 허용하는 서브픽셀·반올림 오차(px) */
const SCROLL_END_THRESHOLD = 4;

/**
 * 채팅 진입 직후 초기 스크롤이 실제 맨 아래에 정착했는지 프레임 단위로 판정하는
 * 트래커를 만든다.
 *
 * 메시지 아이템의 content-visibility:auto 추정 높이(contain-intrinsic-size)로
 * 계산된 "가짜 맨 끝"에 먼저 스크롤됐다가, 실제 렌더링으로 scrollHeight가 튀면서
 * 진짜 맨 끝으로 재보정되기까지 몇 프레임이 걸린다. 이 정착 전 상태가 화면에
 * 노출되지 않도록, "맨 아래 도달 + 직전 프레임과 scrollHeight 동일(높이 안정)"을
 * 모두 만족할 때만 정착으로 판정한다. 첫 프레임은 비교 대상이 없어 항상 false다.
 */
export function createInitialScrollSettleTracker() {
  let previousScrollHeight: number | null = null;

  return (frame: ScrollFrame): boolean => {
    const distanceToEnd =
      frame.scrollHeight - frame.scrollTop - frame.clientHeight;
    const isAtEnd = distanceToEnd <= SCROLL_END_THRESHOLD;
    const isHeightStable = previousScrollHeight === frame.scrollHeight;

    previousScrollHeight = frame.scrollHeight;

    return isAtEnd && isHeightStable;
  };
}
