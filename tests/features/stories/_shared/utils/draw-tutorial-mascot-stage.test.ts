import { describe, expect, it } from 'vitest';

import {
  TUTORIAL_MASCOT_HOME,
  TUTORIAL_MASCOT_HOP,
  tutorialMascotPose,
} from '@/features/stories/_shared/utils/draw-tutorial-mascot-stage';

describe('tutorialMascotPose', () => {
  it('한 바퀴 동안 순간이동하지 않고 발이 대화창 테두리 아래로 내려가지 않는다', () => {
    let previous = tutorialMascotPose(0);

    for (let time = 1; time <= 5000; time += 1) {
      const pose = tutorialMascotPose(time);

      expect(Math.abs(pose.y - previous.y), `t=${time}`).toBeLessThan(0.005);
      expect(pose.x).toBe(TUTORIAL_MASCOT_HOME.x);
      expect(pose.y).toBeLessThanOrEqual(TUTORIAL_MASCOT_HOME.y);
      expect(pose.y).toBeGreaterThanOrEqual(
        TUTORIAL_MASCOT_HOME.y - TUTORIAL_MASCOT_HOP,
      );
      previous = pose;
    }
  });

  it('동작 줄이기에서 멈추는 첫 순간은 가만히 선 자세다', () => {
    const pose = tutorialMascotPose(0);

    expect(pose.y).toBe(TUTORIAL_MASCOT_HOME.y);
    expect(pose.rotation).toBe(0);
    expect(pose.eyes).toBe('round');
  });
});
