import { describe, expect, it } from 'vitest';

import {
  COMPLETING_LOOP_MILLIS,
  type CompletingAct,
  completingMoment,
  type Cue,
  cueMillis,
  HOME,
  MASCOT_HALF_WIDTH,
  MASCOT_HEIGHT,
  STAGE_HEIGHT,
} from '@/features/studio/menu/utils/story-completing-choreography';

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
        'TYPING',
        'PAINTING',
        'BOUNCING',
        'WALL_JUMP',
        'INTERLUDE',
      ]),
    );
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
      'TYPING',
      'TYPING_DONE',
      'STROKE_1',
      'STROKE_2',
      'BLOOM',
      'SIGNATURE',
    ];

    for (const cue of cues) expect(cueMillis(cue), cue).toBeGreaterThan(0);
  });

  it('Android 와 같은 약 32초 주기로 돈다', () => {
    expect(COMPLETING_LOOP_MILLIS).toBe(31970);
  });
});
