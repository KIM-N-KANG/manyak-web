import { describe, expect, it } from 'vitest';

import { isPointInContainedImage } from '@/lib/contained-image';

// 세로 화면(400×800)에 정사각형 이미지를 contain으로 그리면 가운데 400×400만 그림이고 위아래 200px는 여백이다.
const box = { left: 0, top: 0, width: 400, height: 800 };
const square = { width: 1000, height: 1000 };

describe('isPointInContainedImage', () => {
  it('그림 영역 안의 점이면 true를 반환한다', () => {
    expect(
      isPointInContainedImage({
        box,
        natural: square,
        point: { x: 200, y: 400 },
      }),
    ).toBe(true);
    expect(
      isPointInContainedImage({
        box,
        natural: square,
        point: { x: 0, y: 200 },
      }),
    ).toBe(true);
  });

  it('위아래 레터박스 여백의 점이면 false를 반환한다', () => {
    expect(
      isPointInContainedImage({
        box,
        natural: square,
        point: { x: 200, y: 100 },
      }),
    ).toBe(false);
    expect(
      isPointInContainedImage({
        box,
        natural: square,
        point: { x: 200, y: 700 },
      }),
    ).toBe(false);
  });

  it('가로로 긴 이미지는 좌우가 아니라 위아래가 여백이고, 세로로 긴 이미지는 좌우가 여백이다', () => {
    const wideBox = { left: 100, top: 50, width: 800, height: 400 };
    const tall = { width: 300, height: 600 };

    // 800×400 박스에 1:2 이미지 → 200×400 그림이 가로 가운데(x 400~600)에 놓인다.
    expect(
      isPointInContainedImage({
        box: wideBox,
        natural: tall,
        point: { x: 500, y: 250 },
      }),
    ).toBe(true);
    expect(
      isPointInContainedImage({
        box: wideBox,
        natural: tall,
        point: { x: 150, y: 250 },
      }),
    ).toBe(false);
  });

  it('원본 크기를 모르면(로드 전) false를 반환한다', () => {
    expect(
      isPointInContainedImage({
        box,
        natural: { width: 0, height: 0 },
        point: { x: 200, y: 400 },
      }),
    ).toBe(false);
  });
});
