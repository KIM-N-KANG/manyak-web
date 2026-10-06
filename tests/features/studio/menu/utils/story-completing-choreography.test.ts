import { describe, expect, it } from 'vitest';

import {
  COMPLETING_LOOP_MILLIS,
  type CompletingAct,
  completingMoment,
  type Cue,
  cueMillis,
  cueStart,
  HOME,
  MASCOT_HALF_WIDTH,
  MASCOT_HEIGHT,
  MASCOT_SIZE,
  onCanvas,
  PORTRAIT_HAIR,
  STAGE_HEIGHT,
} from '@/features/studio/menu/utils/story-completing-choreography';
import { brushTipOffset, strokeAt } from '@/lib/mascot/mascot-choreography';

const turn = (a: number, b: number) => {
  const difference = Math.abs(a - b) % 360;

  return Math.min(difference, 360 - difference);
};

describe('story-completing-choreography', () => {
  // 1ms 사이에 가장 빠른 점프도 표지 폭의 0.3% 남짓 움직인다. 그보다 훨씬 큰 차이는 동작 사이의 이음매에서
  // 순간이동한 것이다. 벽에 붙는 순간만 찌그러진 폭만큼 발이 옮겨 가므로 그 정도는 허용한다.
  it('막 사이와 한 바퀴 끝을 포함해 마스코트가 순간이동하지 않는다', () => {
    let previous = completingMoment(0).pose;

    for (let time = 1; time <= COMPLETING_LOOP_MILLIS; time += 1) {
      const { pose } = completingMoment(time);
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

  it('마스코트가 표지 밖으로 나가지 않는다', () => {
    for (let time = 0; time < COMPLETING_LOOP_MILLIS; time += 8) {
      const { pose } = completingMoment(time);
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

  it('바닥 가운데에서 시작하고 모든 막을 거친다', () => {
    const { pose } = completingMoment(0);

    expect(pose.x).toBeCloseTo(HOME.x);
    expect(pose.y).toBeCloseTo(HOME.y);

    const acts = new Set<CompletingAct>();

    for (let time = 0; time < COMPLETING_LOOP_MILLIS; time += 50)
      acts.add(completingMoment(time).act);

    expect(acts).toEqual(
      new Set([
        'KEYWORDS',
        'STORYLINE',
        'ENERGY',
        'TYPING',
        'PAINTING',
        'BOUNCING',
        'WALL_JUMP',
        'INTERLUDE',
      ]),
    );
  });

  it('인물화를 그리는 동안 붓털 끝이 붓길 위에 있다', () => {
    let painting = 0;

    while (completingMoment(painting).act !== 'PAINTING') painting += 10;

    while (completingMoment(painting - 1).act === 'PAINTING') painting -= 1;

    const start = painting + cueStart('HAIR');

    for (const f of [0, 0.4, 0.8]) {
      const { pose } = completingMoment(start + f * cueMillis('HAIR'));
      const offset = brushTipOffset(
        MASCOT_SIZE,
        pose.rotation,
        pose.scaleX,
        pose.scaleY,
      );
      const target = onCanvas(strokeAt(PORTRAIT_HAIR, f));

      expect(pose.x + offset.x, `f=${f}`).toBeCloseTo(target.x, 5);
      expect(pose.y + offset.y, `f=${f}`).toBeCloseTo(target.y, 5);
    }
  });

  it('모든 소품 신호가 동작에 연결돼 있다', () => {
    const cues: Cue[] = [
      'KEYWORD_1',
      'KEYWORD_2',
      'KEYWORD_3',
      'KEYWORDS_LEAVE',
      'STORYLINE_1_LOOK',
      'STORYLINE_3_LOOK',
      'STORYLINE_PICK',
      'DOZE',
      'CAN_DROP',
      'CAN_CATCH',
      'DRINK',
      'POWER_UP',
      'TYPING',
      'TYPING_DONE',
      'HAT',
      'BRUSH',
      'MOON',
      'HAIR',
      'FACE',
      'BLUSH',
      'SCARF',
      'SIGNATURE',
      'TOSS',
    ];

    for (const cue of cues) expect(cueMillis(cue), cue).toBeGreaterThan(0);
  });

  it('약 38초 주기로 돈다', () => {
    expect(COMPLETING_LOOP_MILLIS).toBe(37710);
  });
});
