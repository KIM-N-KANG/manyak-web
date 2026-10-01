import { describe, expect, it } from 'vitest';

import {
  advanceMarketingConsentRecord,
  answerMarketingConsentRecord,
  MARKETING_CONSENT_REASK_AFTER_ENTRIES,
} from '@/features/my/_shared/utils/marketing-consent-storage';

describe('marketing-consent-storage', () => {
  it('아직 답하지 않은 회원은 재질문 대상이 아니다(필수 동의 시트가 묻는다)', () => {
    expect(advanceMarketingConsentRecord(null)).toEqual({
      record: null,
      shouldReask: false,
    });
  });

  it('첫 거절 뒤에는 세 번째 재진입에서 다시 묻는다', () => {
    let record = answerMarketingConsentRecord(null, false);

    expect(record).toEqual({ stage: 'declined-once', entriesSinceDecline: 0 });

    for (let i = 1; i < MARKETING_CONSENT_REASK_AFTER_ENTRIES; i += 1) {
      const step = advanceMarketingConsentRecord(record);

      expect(step.shouldReask).toBe(false);
      record = step.record!;
    }

    expect(advanceMarketingConsentRecord(record).shouldReask).toBe(true);
  });

  it('두 번째 거절과 허용은 닫혀서 다시 묻지 않는다', () => {
    const declinedOnce = answerMarketingConsentRecord(null, false);

    expect(answerMarketingConsentRecord(declinedOnce, false).stage).toBe(
      'closed',
    );
    expect(answerMarketingConsentRecord(null, true).stage).toBe('closed');
    expect(
      advanceMarketingConsentRecord({
        stage: 'closed',
        entriesSinceDecline: 9,
      }),
    ).toEqual({
      record: { stage: 'closed', entriesSinceDecline: 9 },
      shouldReask: false,
    });
  });
});
