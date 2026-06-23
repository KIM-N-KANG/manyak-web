import { describe, expect, it } from 'vitest';

import { shouldAutoStartTour } from './onboarding-policy';

describe('shouldAutoStartTour', () => {
  it('안 봤고 타깃이 준비됐고 아직 시작 안 했으면 시작한다', () => {
    expect(
      shouldAutoStartTour({
        seen: false,
        targetReady: true,
        alreadyStarted: false,
      }),
    ).toBe(true);
  });

  it('이미 봤으면 시작하지 않는다', () => {
    expect(
      shouldAutoStartTour({
        seen: true,
        targetReady: true,
        alreadyStarted: false,
      }),
    ).toBe(false);
  });

  it('타깃이 준비되지 않았으면 시작하지 않는다', () => {
    expect(
      shouldAutoStartTour({
        seen: false,
        targetReady: false,
        alreadyStarted: false,
      }),
    ).toBe(false);
  });

  it('이미 시작했으면 다시 시작하지 않는다', () => {
    expect(
      shouldAutoStartTour({
        seen: false,
        targetReady: true,
        alreadyStarted: true,
      }),
    ).toBe(false);
  });
});
