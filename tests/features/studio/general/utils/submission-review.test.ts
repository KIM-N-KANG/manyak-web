import { describe, expect, it } from 'vitest';

import { readSubmissionReview } from '@/features/studio/general/utils/submission-review';

describe('readSubmissionReview', () => {
  it('승인된 제출본은 스토리 id와 함께 반환한다', () => {
    expect(
      readSubmissionReview({ status: 'APPROVED', storyId: 'story-1' }),
    ).toEqual({ status: 'APPROVED', storyId: 'story-1' });
  });

  it('반려·실패는 그 상태를 반환한다', () => {
    expect(readSubmissionReview({ status: 'REJECTED' })).toEqual({
      status: 'REJECTED',
    });
    expect(readSubmissionReview({ status: 'FAILED' })).toEqual({
      status: 'FAILED',
    });
  });

  it('스토리 id 없는 승인·알 수 없는 응답은 대기 중으로 본다', () => {
    expect(readSubmissionReview({ status: 'APPROVED', storyId: null })).toEqual(
      { status: 'PENDING' },
    );
    expect(readSubmissionReview(null)).toEqual({ status: 'PENDING' });
    expect(readSubmissionReview({ status: 'PENDING' })).toEqual({
      status: 'PENDING',
    });
  });
});
