import { describe, expect, it } from 'vitest';

import {
  actStart,
  brushTipOffset,
  cueMillis,
  cueStart,
  HOME,
  MASCOT_HALF_WIDTH,
  MASCOT_HEIGHT,
  onPaper,
  parseStroke,
  REALTIME_IMAGE_INTRO_MILLIS,
  REALTIME_IMAGE_LOOP_MILLIS,
  type RealtimeImageAct,
  type RealtimeImageCue,
  realtimeImageMoment,
  SKETCH_CONTOUR,
  STAGE_HEIGHT,
  STARS,
  strokeAt,
} from '@/features/chats/room/utils/realtime-image-choreography';

// 준비 막과 한 바퀴, 그리고 다음 바퀴로 넘어가는 이음매까지 본다.
const SPAN = REALTIME_IMAGE_INTRO_MILLIS + REALTIME_IMAGE_LOOP_MILLIS + 1000;

const turn = (a: number, b: number) => {
  const difference = Math.abs(a - b) % 360;

  return Math.min(difference, 360 - difference);
};

describe('realtime-image-choreography', () => {
  // 1ms 사이에 가장 빠른 점프도 무대 폭의 0.3% 남짓 움직인다. 그보다 훨씬 큰 차이는 동작 사이의 이음매에서
  // 순간이동한 것이다.
  it('준비 막, 막 사이, 한 바퀴 끝을 포함해 마스코트가 순간이동하지 않는다', () => {
    let previous = realtimeImageMoment(0).pose;

    for (let time = 1; time <= SPAN; time += 1) {
      const { pose } = realtimeImageMoment(time);
      const jump = Math.max(
        Math.abs(pose.x - previous.x),
        Math.abs(pose.y - previous.y),
      );

      expect(jump, `t=${time}`).toBeLessThan(0.025);
      expect(turn(pose.rotation, previous.rotation), `t=${time}`).toBeLessThan(
        5,
      );
      previous = pose;
    }
  });

  it('마스코트가 무대 밖으로 나가지 않는다', () => {
    for (let time = 0; time < SPAN; time += 4) {
      const { pose } = realtimeImageMoment(time);
      const halfWidth = MASCOT_HALF_WIDTH * pose.scaleX;

      expect(pose.x - halfWidth, `t=${time} left`).toBeGreaterThanOrEqual(
        -0.001,
      );
      expect(pose.x + halfWidth, `t=${time} right`).toBeLessThanOrEqual(1.001);
      expect(
        pose.y - MASCOT_HEIGHT * pose.scaleY,
        `t=${time} top`,
      ).toBeGreaterThanOrEqual(-0.001);
      expect(pose.y, `t=${time} bottom`).toBeLessThanOrEqual(STAGE_HEIGHT);
    }
  });

  it('바닥에서 시작해 준비 막을 한 번 연기하고 아자아자부터 정리까지 반복한다', () => {
    const { pose } = realtimeImageMoment(0);

    expect(pose.x).toBeCloseTo(HOME.x);
    expect(pose.y).toBeCloseTo(HOME.y);

    const order: RealtimeImageAct[] = [];

    for (let time = 0; time < SPAN; time += 50) {
      const { act } = realtimeImageMoment(time);

      if (order[order.length - 1] !== act) order.push(act);
    }

    expect(order).toEqual([
      'GEAR_UP',
      'HYPE',
      'SKETCH',
      'RELIEF',
      'WATERCOLOR',
      'DAYDREAM',
      'CONSTELLATION',
      'RESET',
      'HYPE',
    ]);
  });

  it('그리는 동안 붓털 끝이 붓길 위에 있다', () => {
    const start =
      REALTIME_IMAGE_INTRO_MILLIS + actStart('SKETCH') + cueStart('CONTOUR');

    for (const f of [0, 0.3, 0.6, 1]) {
      const time = start + f * (cueMillis('CONTOUR') - 1);
      const { pose } = realtimeImageMoment(time);
      const offset = brushTipOffset(pose.rotation, pose.scaleX, pose.scaleY);
      const target = onPaper(
        strokeAt(SKETCH_CONTOUR, (time - start) / cueMillis('CONTOUR')),
      );

      expect(pose.x + offset.x, `f=${f}`).toBeCloseTo(target.x, 6);
      expect(pose.y + offset.y, `f=${f}`).toBeCloseTo(target.y, 6);
    }
  });

  it('모든 소품 신호가 동작에 연결돼 있다', () => {
    const cues: RealtimeImageCue[] = [
      'HAT',
      'BRUSH',
      'CHARGE',
      'PUMP_1',
      'PUMP_2',
      'CONTOUR',
      'HATCH',
      'LASH',
      'EXHALE',
      'HALO',
      'BOB',
      'FACE',
      'CHEEK',
      'SCARF',
      'PONDER',
      'IDEA',
      'FLIP',
      'CONNECT',
      ...STARS.map((star) => star.cue),
    ];

    for (const cue of cues) expect(cueMillis(cue), cue).toBeGreaterThan(0);
  });

  // 실시간 이미지 응답은 약 15초 걸린다. 세 번째 그림까지 그 전에 다 그려야 기다리는 동안 안무가 끝을 맺는다.
  it('준비 막을 포함해 세 번째 그림을 15초 안에 완성하고 약 15초 주기로 돈다', () => {
    const constellationDone =
      REALTIME_IMAGE_INTRO_MILLIS +
      actStart('CONSTELLATION') +
      cueStart('CONNECT') +
      cueMillis('CONNECT');

    expect(constellationDone).toBeLessThanOrEqual(15000);
    expect(REALTIME_IMAGE_INTRO_MILLIS).toBe(1300);
    expect(REALTIME_IMAGE_LOOP_MILLIS).toBe(15250);
  });

  it('붓길을 길이에 고르게 따라간다', () => {
    const stroke = parseStroke('M0,0 L3,4 L3,10');

    expect(stroke.total).toBe(11);
    expect(strokeAt(stroke, 0)).toEqual({ x: 0, y: 0 });
    expect(strokeAt(stroke, 5 / 11).y).toBeCloseTo(4);
    expect(strokeAt(stroke, 1)).toEqual({ x: 3, y: 10 });
  });
});
