import { describe, expect, it } from 'vitest';

import { parseOnboardingSeen } from '@/features/onboarding/utils/onboarding-storage';

describe('parseOnboardingSeen', () => {
  it('저장값이 "1"이면 봤음으로 본다', () => {
    expect(parseOnboardingSeen('1')).toBe(true);
  });

  it('null이면 안 봤음으로 본다', () => {
    expect(parseOnboardingSeen(null)).toBe(false);
  });

  it('"1"이 아닌 다른 값은 안 봤음으로 본다', () => {
    expect(parseOnboardingSeen('0')).toBe(false);
    expect(parseOnboardingSeen('')).toBe(false);
    expect(parseOnboardingSeen('true')).toBe(false);
  });
});
