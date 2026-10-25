import { describe, expect, it } from 'vitest';

import { isStoryCreationCreditShort } from '@/features/stories/new/utils/story-creation-credit';

describe('isStoryCreationCreditShort', () => {
  it('체험이 없고 잔액이 완성 비용보다 적으면 막는다', () => {
    expect(
      isStoryCreationCreditShort({
        balance: 199,
        cost: 200,
        trialRemaining: 0,
      }),
    ).toBe(true);
  });

  it('잔액이 비용 이상이거나 체험이 남았으면 막지 않는다', () => {
    expect(
      isStoryCreationCreditShort({
        balance: 200,
        cost: 200,
        trialRemaining: 0,
      }),
    ).toBe(false);
    expect(
      isStoryCreationCreditShort({ balance: 0, cost: 200, trialRemaining: 1 }),
    ).toBe(false);
    expect(
      isStoryCreationCreditShort({
        balance: 0,
        cost: 200,
        trialRemaining: null,
      }),
    ).toBe(false);
  });

  it('잔액, 비용, 체험 중 하나라도 모르면 막지 않는다', () => {
    expect(
      isStoryCreationCreditShort({
        balance: undefined,
        cost: 200,
        trialRemaining: 0,
      }),
    ).toBe(false);
    expect(
      isStoryCreationCreditShort({
        balance: 0,
        cost: undefined,
        trialRemaining: 0,
      }),
    ).toBe(false);
    expect(
      isStoryCreationCreditShort({
        balance: 0,
        cost: 200,
        trialRemaining: undefined,
      }),
    ).toBe(false);
  });
});
