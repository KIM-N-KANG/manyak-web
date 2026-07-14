import { describe, expect, it } from 'vitest';

import { getRandomSuggestion } from '@/features/chats/room/utils/random-suggestion';

describe('getRandomSuggestion', () => {
  it('추천이 없거나 공백뿐이면 null을 반환한다', () => {
    expect(getRandomSuggestion([], () => 0)).toBeNull();
    expect(getRandomSuggestion([' ', '\n'], () => 0)).toBeNull();
  });

  it('랜덤 값에 해당하는 추천과 원래 위치를 반환한다', () => {
    expect(getRandomSuggestion(['첫째', '둘째', '셋째'], () => 0.5)).toEqual({
      text: '둘째',
      position: 1,
    });
  });

  it('공백 추천을 제외해도 원래 배열 위치를 유지한다', () => {
    expect(getRandomSuggestion([' ', '둘째', '셋째'], () => 0)).toEqual({
      text: '둘째',
      position: 1,
    });
  });
});
