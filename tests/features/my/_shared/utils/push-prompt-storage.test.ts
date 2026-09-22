import { describe, expect, it } from 'vitest';

import {
  advancePushPromptRecord,
  answerPushPromptRecord,
  PUSH_PROMPT_REASK_AFTER_SUBMITS,
} from '@/features/my/_shared/utils/push-prompt-storage';

describe('push-prompt-storage', () => {
  it('처음에는 바로 묻는다', () => {
    expect(advancePushPromptRecord(null)).toEqual({
      record: null,
      shouldPrompt: true,
    });
  });

  it('첫 거절 뒤에는 세 번째 제작 요청에서 다시 묻는다', () => {
    let record = answerPushPromptRecord(null, false);

    expect(record).toEqual({ stage: 'declined-once', submitsSinceDecline: 0 });

    for (let i = 1; i < PUSH_PROMPT_REASK_AFTER_SUBMITS; i += 1) {
      const step = advancePushPromptRecord(record);

      expect(step.shouldPrompt).toBe(false);
      record = step.record!;
    }

    expect(advancePushPromptRecord(record).shouldPrompt).toBe(true);
  });

  it('두 번째 거절과 허용은 닫혀서 다시 묻지 않는다', () => {
    const declinedOnce = answerPushPromptRecord(null, false);

    expect(answerPushPromptRecord(declinedOnce, false).stage).toBe('closed');
    expect(answerPushPromptRecord(null, true).stage).toBe('closed');
    expect(
      advancePushPromptRecord({ stage: 'closed', submitsSinceDecline: 9 }),
    ).toEqual({
      record: { stage: 'closed', submitsSinceDecline: 9 },
      shouldPrompt: false,
    });
  });
});
