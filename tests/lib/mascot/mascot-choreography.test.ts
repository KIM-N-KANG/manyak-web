import { describe, expect, it } from 'vitest';

import {
  BRUSH_GRIP,
  brushTipOffset,
  easeOutBack,
  mascotPointOffset,
  paintAlong,
  parseStroke,
  type Point,
  point,
} from '@/lib/mascot/mascot-choreography';

const SIZE = 0.15;
const LINE = parseStroke('M0,0 L40,0');
const toStage = (at: Point) => point(at.x / 100, at.y / 100);

describe('mascot-choreography 붓', () => {
  it('붓 회전이 없고 몸이 찌그러지지 않으면 붓털 끝 자리가 지금과 같다', () => {
    // 지금의 붓털 끝(심벌 viewport 좌표)을 몸에 붙인 자리와 같아야 완성 중 표지가 바뀌지 않는다.
    const radians = (-38 * Math.PI) / 180;
    const tip = point(
      BRUSH_GRIP.x - Math.sin(radians) * 16,
      BRUSH_GRIP.y + Math.cos(radians) * 16,
    );

    for (const rotation of [0, 10, -15]) {
      const expected = mascotPointOffset(tip, rotation, 1, 1, SIZE);
      const offset = brushTipOffset(SIZE, rotation);

      expect(offset.x).toBeCloseTo(expected.x, 9);
      expect(offset.y).toBeCloseTo(expected.y, 9);
    }
  });

  it('붓 회전은 쥔 자리를 축으로 붓털 끝만 돌린다', () => {
    const grip = mascotPointOffset(BRUSH_GRIP, 0, 1, 1, SIZE);
    const straight = brushTipOffset(SIZE);
    const turned = brushTipOffset(SIZE, 0, 1, 1, 30);

    expect(Math.hypot(turned.x - grip.x, turned.y - grip.y)).toBeCloseTo(
      Math.hypot(straight.x - grip.x, straight.y - grip.y),
      9,
    );
    // 캔버스 회전은 시계 방향이 양수라 붓털 끝이 오른쪽 아래에서 아래로 돈다.
    expect(turned.x).toBeLessThan(straight.x);
    expect(turned.y).toBeGreaterThan(straight.y);
  });

  it('선택 값이 없으면 붓 회전과 누름이 0이다', () => {
    const move = paintAlong(400, LINE, toStage, SIZE);

    for (const f of [0, 0.5, 1]) {
      expect(move.pose(f).brush).toBe(0);
      expect(move.pose(f).press).toBe(0);
    }
  });

  it('끌림은 진행 반대쪽으로 붓털 끝을 눕히고 양 끝에서 0이다', () => {
    const move = paintAlong(400, LINE, toStage, SIZE, { lean: 25, press: 1 });
    const middle = move.pose(0.5);

    expect(middle.brush).toBeCloseTo(25, 0);
    expect(middle.press).toBeCloseTo(1, 1);
    expect(move.pose(0).brush).toBeCloseTo(0);
    expect(move.pose(1).brush).toBeCloseTo(0);
    expect(move.pose(1).press).toBeCloseTo(0);

    const back = paintAlong(400, parseStroke('M40,0 L0,0'), toStage, SIZE, {
      lean: 25,
    });

    expect(back.pose(0.5).brush).toBeCloseTo(-25, 0);
  });

  it('붓이 기울고 몸이 찌그러져도 붓털 끝이 붓길 위에 있다', () => {
    const move = paintAlong(400, LINE, toStage, SIZE, {
      lean: 25,
      scribble: true,
    });

    for (const f of [0.2, 0.5, 0.8]) {
      const pose = move.pose(f);
      const offset = brushTipOffset(
        SIZE,
        pose.rotation,
        pose.scaleX,
        pose.scaleY,
        pose.brush,
      );

      expect(pose.x + offset.x, `f=${f}`).toBeCloseTo(0.4 * f, 6);
      expect(pose.y + offset.y, `f=${f}`).toBeCloseTo(0, 6);
    }
  });
});

describe('easeOutBack', () => {
  it('시작 전에는 정확히 0이라 아직 나오지 않은 소품이 그려지지 않는다', () => {
    expect(easeOutBack(0)).toBe(0);
    expect(easeOutBack(-1)).toBe(0);
    expect(easeOutBack(1)).toBeCloseTo(1);
  });
});
