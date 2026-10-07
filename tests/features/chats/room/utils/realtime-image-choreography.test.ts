import { describe, expect, it } from 'vitest';

import {
  actStart,
  BEAM,
  BOWL,
  brushTipOffset,
  cueMillis,
  cueStart,
  EYE,
  FACE,
  HAIR,
  HOME,
  MASCOT_HALF_WIDTH,
  MASCOT_HEIGHT,
  MULLION_H,
  MULLION_V,
  NIGHT,
  onPaper,
  OUTLINE,
  paintColorAt,
  paintedFor,
  parseStroke,
  REALTIME_IMAGE_FINISH_MILLIS,
  REALTIME_IMAGE_INTRO_MILLIS,
  REALTIME_IMAGE_LOOP_MILLIS,
  type RealtimeImageAct,
  type RealtimeImageCue,
  realtimeImageMoment,
  SIGN,
  STAGE_HEIGHT,
  type Stroke,
  strokeAt,
  WINDOW,
} from '@/features/chats/room/utils/realtime-image-choreography';

// 준비 막과 한 바퀴, 그리고 다음 바퀴로 넘어가는 이음매까지 본다.
const SPAN = REALTIME_IMAGE_INTRO_MILLIS + REALTIME_IMAGE_LOOP_MILLIS + 1000;

/** 붓털 끝 가까이의 붓털 반폭(무대 폭 단위)이다. */
const BRISTLE_HALF_WIDTH = 0.004;

const turn = (a: number, b: number) => {
  const difference = Math.abs(a - b) % 360;

  return Math.min(difference, 360 - difference);
};

/** 붓길 cue 와 그 붓길이다. */
const STROKES: [RealtimeImageCue, RealtimeImageAct, Stroke][] = [
  ['WINDOW', 'SKETCH', WINDOW],
  ['MULLION_V', 'SKETCH', MULLION_V],
  ['MULLION_H', 'SKETCH', MULLION_H],
  ['OUTLINE', 'SKETCH', OUTLINE],
  ['NIGHT', 'WASH', NIGHT],
  ['HAIR', 'FIGURE', HAIR],
  ['FACE', 'FIGURE', FACE],
  ['EYE', 'FIGURE', EYE],
  ['BEAM', 'FINISH', BEAM],
  ['SIGN', 'FINISH', SIGN],
];

/**
 * 시각의 붓털 끝 자리를 반환한다.
 *
 * @param time 무대가 시작된 뒤 흐른 시간
 * @returns 무대 좌표
 */
function tipAt(time: number) {
  const { pose } = realtimeImageMoment(time);
  const offset = brushTipOffset(
    pose.rotation,
    pose.scaleX,
    pose.scaleY,
    pose.brush,
  );

  return { x: pose.x + offset.x, y: pose.y + offset.y };
}

/**
 * 한 바퀴 안의 cue 가 무대 시작부터 언제 시작하는지 반환한다.
 *
 * @param act cue 가 속한 막
 * @param cue 소품 신호
 * @returns 무대 시작부터의 시각(ms)
 */
const startOf = (
  act: Exclude<RealtimeImageAct, 'GEAR_UP'>,
  cue: RealtimeImageCue,
) => REALTIME_IMAGE_INTRO_MILLIS + actStart(act) + cueStart(cue);

describe('realtime-image-choreography', () => {
  // 1ms 사이에 가장 빠른 점프도 무대 폭의 0.3% 남짓 움직인다. 그보다 훨씬 큰 차이는 동작 사이의 이음매에서
  // 순간이동한 것이다. 붓 회전과 누름도 같은 이음매에서 튀지 않아야 한다.
  it('준비 막, 막 사이, 한 바퀴 끝을 포함해 마스코트와 붓이 순간이동하지 않는다', () => {
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
      expect(turn(pose.brush, previous.brush), `t=${time} brush`).toBeLessThan(
        5,
      );
      expect(Math.abs(pose.press - previous.press), `t=${time}`).toBeLessThan(
        0.2,
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

  it('바닥에서 시작해 준비 막을 한 번 연기하고 밑그림부터 종이 넘기기까지 반복한다', () => {
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
      'SKETCH',
      'RELIEF',
      'WASH',
      'FIGURE',
      'DAYDREAM',
      'FINISH',
      'SHOWCASE',
      'PAGE_TURN',
      'SKETCH',
    ]);
  });

  it('그리는 동안 기운 붓의 털 끝이 붓길 위에 있다', () => {
    for (const [cue, act, stroke] of STROKES) {
      const start = startOf(act as Exclude<RealtimeImageAct, 'GEAR_UP'>, cue);

      for (const f of [0, 0.3, 0.6, 1]) {
        const time = start + f * (cueMillis(cue) - 1);
        const target = onPaper(
          strokeAt(stroke, (time - start) / cueMillis(cue)),
        );
        const tip = tipAt(time);

        expect(tip.x, `${cue} f=${f}`).toBeCloseTo(target.x, 6);
        expect(tip.y, `${cue} f=${f}`).toBeCloseTo(target.y, 6);
      }
    }
  });

  // 정신없지 않게 붓끝이 천천히 움직여야 한다. 붓길 길이(격자 칸)를 긋는 시간으로 나눈 평균 속도를 본다.
  it('모든 획을 초당 격자 160칸보다 느리게 긋는다', () => {
    for (const [cue, , stroke] of STROKES)
      expect((stroke.total / cueMillis(cue)) * 1000, cue).toBeLessThan(160);
  });

  it('그을 때 붓털 끝이 끌리고 밑칠에서는 붓털이 눌린다', () => {
    const window = realtimeImageMoment(
      startOf('SKETCH', 'WINDOW') + cueMillis('WINDOW') * 0.15,
    ).pose;
    const night = realtimeImageMoment(
      startOf('WASH', 'NIGHT') + cueMillis('NIGHT') * 0.5,
    ).pose;

    expect(Math.abs(window.brush)).toBeGreaterThan(5);
    expect(night.press).toBeGreaterThan(0.5);
  });

  it('헹굴 때만 붓털 끝이 물그릇에 들어간다', () => {
    const rinses = (
      [
        ['RELIEF', 'RINSE_1'],
        ['DAYDREAM', 'RINSE_2'],
        ['PAGE_TURN', 'RINSE_3'],
      ] as const
    ).map(([act, cue]) => [
      actStart(act) + cueStart(cue),
      actStart(act) + cueStart(cue) + cueMillis(cue),
    ]);
    let dipped = 0;

    for (let time = 0; time < SPAN; time += 2) {
      const tip = tipAt(time);
      // 붓털 끝 옆의 붓털이 물그릇 몸통에 가려지지 않도록 붓털 두께만큼 넓게 본다.
      const inBowl =
        Math.abs(tip.x - BOWL.x) < BOWL.halfWidth + BRISTLE_HALF_WIDTH &&
        tip.y > BOWL.rim;
      const lap =
        (time - REALTIME_IMAGE_INTRO_MILLIS) % REALTIME_IMAGE_LOOP_MILLIS;
      const rinsing =
        time >= REALTIME_IMAGE_INTRO_MILLIS &&
        rinses.some(([from, to]) => lap >= from && lap < to);

      if (!inBowl) continue;

      dipped += 1;
      expect(rinsing, `t=${time}`).toBe(true);
    }

    expect(dipped).toBeGreaterThan(0);
  });

  it('모든 소품 신호가 동작에 연결돼 있다', () => {
    const cues: RealtimeImageCue[] = [
      'HAT',
      'BRUSH',
      'EXHALE',
      'RINSE_1',
      'PONDER',
      'IDEA',
      'RINSE_2',
      'CHEEK',
      'SHOWCASE',
      'TURN',
      'RINSE_3',
      ...STROKES.map(([cue]) => cue),
    ];

    for (const cue of cues) expect(cueMillis(cue), cue).toBeGreaterThan(0);
  });

  // 실시간 이미지 응답은 약 15초 걸린다. 준비 막을 포함해 그 순간에 사인을 마쳐 그림 한 장이 끝을 맺는다.
  it('준비 막을 포함해 15초에 사인을 마치고 16초 남짓한 주기로 돈다', () => {
    const signed = startOf('FINISH', 'SIGN') + cueMillis('SIGN');

    expect(REALTIME_IMAGE_FINISH_MILLIS).toBe(signed);
    expect(Math.abs(signed - 15000)).toBeLessThanOrEqual(50);
    expect(REALTIME_IMAGE_INTRO_MILLIS).toBe(1300);
    expect(REALTIME_IMAGE_LOOP_MILLIS).toBeGreaterThanOrEqual(16000);
    expect(REALTIME_IMAGE_LOOP_MILLIS).toBeLessThanOrEqual(17000);
  });

  it('지난 막의 그림은 남고 오지 않은 막의 그림은 아직 없다', () => {
    expect(paintedFor('WINDOW', 'GEAR_UP', 500)).toBe(Number.NEGATIVE_INFINITY);
    expect(paintedFor('NIGHT', 'SKETCH', 500)).toBe(Number.NEGATIVE_INFINITY);
    expect(paintedFor('NIGHT', 'FIGURE', 0)).toBe(Number.POSITIVE_INFINITY);
    expect(paintedFor('SIGN', 'PAGE_TURN', 0)).toBe(Number.POSITIVE_INFINITY);
    expect(paintedFor('HAIR', 'FIGURE', cueStart('HAIR') + 40)).toBeCloseTo(40);
  });

  it('붓털 물감은 헹굴 때마다 다음 층 색으로 바뀌고 종이를 넘기면 연필색으로 돌아온다', () => {
    expect(paintColorAt('SKETCH', 0)).toBe('PENCIL');
    expect(paintColorAt('RELIEF', 0)).toBe('PENCIL');
    expect(
      paintColorAt('RELIEF', cueStart('RINSE_1') + cueMillis('RINSE_1')),
    ).toBe('GRAY');
    expect(paintColorAt('FIGURE', 0)).toBe('GRAY');
    expect(paintColorAt('FINISH', 0)).toBe('GREEN');
    expect(
      paintColorAt('PAGE_TURN', cueStart('RINSE_3') + cueMillis('RINSE_3')),
    ).toBe('PENCIL');
    expect(paintColorAt('GEAR_UP', 0)).toBe('PENCIL');
  });

  it('붓길을 길이에 고르게 따라간다', () => {
    const stroke = parseStroke('M0,0 L3,4 L3,10');

    expect(stroke.total).toBe(11);
    expect(strokeAt(stroke, 0)).toEqual({ x: 0, y: 0 });
    expect(strokeAt(stroke, 5 / 11).y).toBeCloseTo(4);
    expect(strokeAt(stroke, 1)).toEqual({ x: 3, y: 10 });
  });
});
