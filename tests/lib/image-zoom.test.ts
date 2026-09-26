import { describe, expect, it } from 'vitest';

import {
  gestureImageZoom,
  INITIAL_IMAGE_ZOOM,
  toggleImageZoom,
} from '@/lib/image-zoom';

// 400×800 확대 영역, 화면 중심 (200, 400).
const viewport = { width: 400, height: 800, center: { x: 200, y: 400 } };

describe('toggleImageZoom', () => {
  it('원래 크기면 누른 지점이 제자리에 남도록 2.5배로 키운다', () => {
    const zoom = toggleImageZoom(
      INITIAL_IMAGE_ZOOM,
      { x: 250, y: 450 },
      viewport,
    );

    expect(zoom).toEqual({ scale: 2.5, x: -75, y: -75 });
  });

  it('가장자리를 누르면 이미지가 영역 밖으로 빠지지 않게 이동량을 자른다', () => {
    const zoom = toggleImageZoom(INITIAL_IMAGE_ZOOM, { x: 0, y: 0 }, viewport);

    // 최대 이동량은 (크기 × (2.5 - 1)) / 2 = 300, 600이다.
    expect(zoom).toEqual({ scale: 2.5, x: 300, y: 600 });
  });

  it('확대 중이면 원래 크기로 되돌린다', () => {
    expect(
      toggleImageZoom({ scale: 2.5, x: 40, y: -10 }, { x: 0, y: 0 }, viewport),
    ).toEqual(INITIAL_IMAGE_ZOOM);
  });
});

describe('gestureImageZoom', () => {
  it('두 손가락 사이가 두 배로 벌어지면 두 배로 키우고 중점 아래 그림을 고정한다', () => {
    const zoom = gestureImageZoom({
      start: INITIAL_IMAGE_ZOOM,
      startPoints: [
        { x: 150, y: 400 },
        { x: 250, y: 400 },
      ],
      points: [
        { x: 100, y: 400 },
        { x: 300, y: 400 },
      ],
      viewport,
    });

    expect(zoom).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('배율은 1~5배로 제한한다', () => {
    const pinch = (to: number) =>
      gestureImageZoom({
        start: INITIAL_IMAGE_ZOOM,
        startPoints: [
          { x: 190, y: 400 },
          { x: 210, y: 400 },
        ],
        points: [
          { x: 200 - to, y: 400 },
          { x: 200 + to, y: 400 },
        ],
        viewport,
      }).scale;

    expect(pinch(1000)).toBe(5);
    expect(pinch(1)).toBe(1);
  });

  it('한 손가락은 확대 중일 때만 끌어서 이동한다', () => {
    const drag = (scale: number) =>
      gestureImageZoom({
        start: { scale, x: 0, y: 0 },
        startPoints: [{ x: 200, y: 400 }],
        points: [{ x: 230, y: 380 }],
        viewport,
      });

    expect(drag(1)).toEqual(INITIAL_IMAGE_ZOOM);
    expect(drag(2)).toEqual({ scale: 2, x: 30, y: -20 });
  });
});
