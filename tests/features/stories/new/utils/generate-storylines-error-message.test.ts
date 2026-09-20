import { describe, expect, it } from 'vitest';

import { getGenerateStorylinesErrorMessage } from '@/features/stories/new/utils/generate-storylines-error-message';

describe('getGenerateStorylinesErrorMessage', () => {
  it('첫 생성 실패에는 첫 생성 실패 문구를 반환한다', () => {
    expect(getGenerateStorylinesErrorMessage({ isRegeneration: false })).toBe(
      '스토리라인을 만들지 못했어요',
    );
  });

  it('재생성 실패에는 재생성 실패 문구를 반환한다', () => {
    expect(getGenerateStorylinesErrorMessage({ isRegeneration: true })).toBe(
      '스토리라인을 다시 만들지 못했어요',
    );
  });
});
