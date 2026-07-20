import { describe, expect, it } from 'vitest';

import { getGenerateStorylinesErrorMessage } from '@/features/stories/new/utils/generate-storylines-error-message';

describe('getGenerateStorylinesErrorMessage', () => {
  it('첫 생성 실패에는 첫 생성 실패 문구를 반환한다', () => {
    expect(
      getGenerateStorylinesErrorMessage({
        isGuestLimitReached: false,
        isRegeneration: false,
      }),
    ).toBe('스토리라인을 만들지 못했어요');
  });

  it('재생성 실패에는 재생성 실패 문구를 반환한다', () => {
    expect(
      getGenerateStorylinesErrorMessage({
        isGuestLimitReached: false,
        isRegeneration: true,
      }),
    ).toBe('스토리라인을 다시 만들지 못했어요');
  });

  it('게스트 한도 초과는 재생성 여부와 무관하게 한도 문구를 반환한다', () => {
    expect(
      getGenerateStorylinesErrorMessage({
        isGuestLimitReached: true,
        isRegeneration: false,
      }),
    ).toBe('게스트 스토리라인 생성 횟수를 모두 사용했어요');
    expect(
      getGenerateStorylinesErrorMessage({
        isGuestLimitReached: true,
        isRegeneration: true,
      }),
    ).toBe('게스트 스토리라인 생성 횟수를 모두 사용했어요');
  });
});
