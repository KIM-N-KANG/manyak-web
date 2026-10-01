type Point = { x: number; y: number };

/** 확대 배율과 화면 중심 기준 이동량(px). */
export type ImageZoom = { scale: number; x: number; y: number };

/** 확대 영역의 크기와 화면 좌표 중심. */
export type ZoomViewport = { width: number; height: number; center: Point };

export const INITIAL_IMAGE_ZOOM: ImageZoom = { scale: 1, x: 0, y: 0 };

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (a: Point, b: Point) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/**
 * 이동량을 확대된 이미지가 확대 영역 밖으로 빠져나가지 않는 범위로 자른다.
 * 배율이 1이면 이동량은 0이 된다.
 *
 * @param zoom 자를 확대 상태
 * @param viewport 확대 영역
 * @returns 이동량을 제한한 확대 상태
 */
export function clampImageZoom(
  zoom: ImageZoom,
  viewport: ZoomViewport,
): ImageZoom {
  const maxX = (viewport.width * (zoom.scale - 1)) / 2;
  const maxY = (viewport.height * (zoom.scale - 1)) / 2;

  return {
    scale: zoom.scale,
    x: Math.min(maxX, Math.max(-maxX, zoom.x)),
    y: Math.min(maxY, Math.max(-maxY, zoom.y)),
  };
}

/**
 * 더블 탭 확대를 전환한다. 확대 중이면 원래 크기로, 아니면 누른 지점이 제자리에 남도록 2.5배로 키운다.
 *
 * @param zoom 현재 확대 상태
 * @param tap 누른 화면 좌표
 * @param viewport 확대 영역
 * @returns 전환한 확대 상태
 */
export function toggleImageZoom(
  zoom: ImageZoom,
  tap: Point,
  viewport: ZoomViewport,
): ImageZoom {
  if (zoom.scale > MIN_SCALE) return INITIAL_IMAGE_ZOOM;

  return clampImageZoom(
    {
      scale: DOUBLE_TAP_SCALE,
      x: (viewport.center.x - tap.x) * (DOUBLE_TAP_SCALE - 1),
      y: (viewport.center.y - tap.y) * (DOUBLE_TAP_SCALE - 1),
    },
    viewport,
  );
}

/**
 * 제스처 시작 상태와 현재 포인터로 확대 상태를 계산한다.
 * 두 손가락은 두 점 사이 거리 비율로 1~5배 확대하며 시작 중점 아래의 그림을 손가락 중점에 붙여 두고,
 * 한 손가락은 확대 중일 때만 끌어서 이동한다.
 *
 * @param start 제스처 시작 시점의 확대 상태
 * @param startPoints 제스처 시작 시점의 포인터 좌표
 * @param points 현재 포인터 좌표
 * @param viewport 확대 영역
 * @returns 새 확대 상태
 */
export function gestureImageZoom({
  start,
  startPoints,
  points,
  viewport,
}: {
  start: ImageZoom;
  startPoints: Point[];
  points: Point[];
  viewport: ZoomViewport;
}): ImageZoom {
  const [startA, startB] = startPoints;
  const [a, b] = points;

  if (startA && startB && a && b) {
    const startDistance = distance(startA, startB);

    if (startDistance === 0) return start;

    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, (start.scale * distance(a, b)) / startDistance),
    );
    const startMid = midpoint(startA, startB);
    const mid = midpoint(a, b);
    const anchorX = (startMid.x - viewport.center.x - start.x) / start.scale;
    const anchorY = (startMid.y - viewport.center.y - start.y) / start.scale;

    return clampImageZoom(
      {
        scale,
        x: mid.x - viewport.center.x - anchorX * scale,
        y: mid.y - viewport.center.y - anchorY * scale,
      },
      viewport,
    );
  }

  if (!startA || !a || start.scale <= MIN_SCALE) return start;

  return clampImageZoom(
    {
      scale: start.scale,
      x: start.x + a.x - startA.x,
      y: start.y + a.y - startA.y,
    },
    viewport,
  );
}
