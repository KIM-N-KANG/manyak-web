type Rect = { left: number; top: number; width: number; height: number };

type Size = { width: number; height: number };

type Point = { x: number; y: number };

/**
 * `object-fit: contain`으로 그린 이미지에서 한 점이 실제 그림 위에 있는지 판정한다.
 * 요소 박스는 여백(레터박스)까지 포함하므로 원본 비율로 그림 영역을 다시 계산한다.
 *
 * @param box 이미지 요소의 화면 박스
 * @param natural 이미지 원본 크기. 아직 로드되지 않아 0이면 그림이 없는 것으로 본다.
 * @param point 판정할 화면 좌표
 * @returns 점이 그림 영역 안에 있으면 true
 */
export function isPointInContainedImage({
  box,
  natural,
  point,
}: {
  box: Rect;
  natural: Size;
  point: Point;
}) {
  if (natural.width <= 0 || natural.height <= 0) return false;

  const scale = Math.min(
    box.width / natural.width,
    box.height / natural.height,
  );
  const width = natural.width * scale;
  const height = natural.height * scale;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;

  return (
    point.x >= left &&
    point.x <= left + width &&
    point.y >= top &&
    point.y <= top + height
  );
}
