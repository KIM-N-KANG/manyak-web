import { describe, expect, it } from 'vitest';

import { classifyShareFailure } from '@/features/chats/room/utils/share-outcome';

describe('classifyShareFailure', () => {
  it('사용자가 공유 시트를 닫은 AbortError는 취소로 본다', () => {
    const error = new Error('share canceled');

    error.name = 'AbortError';

    expect(classifyShareFailure(error)).toBe('cancelled');
  });

  it('DOMException으로 온 AbortError도 취소로 본다', () => {
    expect(
      classifyShareFailure(new DOMException('canceled', 'AbortError')),
    ).toBe('cancelled');
  });

  it('그 밖의 오류는 폴백 대상이다', () => {
    expect(classifyShareFailure(new Error('not supported'))).toBe('fallback');
  });

  it('Error가 아닌 값도 폴백 대상이다', () => {
    expect(classifyShareFailure('boom')).toBe('fallback');
  });
});
