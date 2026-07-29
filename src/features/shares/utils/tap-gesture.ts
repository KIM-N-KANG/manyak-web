/** 탭으로 인정하는 최대 이동 거리(px). 이보다 크면 스크롤로 본다. */
export const TAP_MAX_MOVE_PX = 10;

/** 탭으로 인정하는 최대 누름 시간(ms). 이보다 길면 길게 누르기로 본다. */
export const TAP_MAX_DURATION_MS = 300;

/**
 * 포인터 다운에서 업까지의 이동과 시간으로 탭 여부를 판정한다.
 *
 * 열람 화면은 화면을 탭할 때마다 헤더·CTA를 토글하므로, 스크롤하려고 끈 동작이
 * 탭으로 오인되면 읽는 내내 오버레이가 깜빡인다.
 *
 * @param input 포인터 다운 대비 이동량과 경과 시간
 * @returns 탭이면 true
 */
export function isTap({
  dx,
  dy,
  elapsedMs,
}: {
  dx: number;
  dy: number;
  elapsedMs: number;
}): boolean {
  return (
    Math.hypot(dx, dy) <= TAP_MAX_MOVE_PX && elapsedMs <= TAP_MAX_DURATION_MS
  );
}
