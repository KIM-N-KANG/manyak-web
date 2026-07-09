import { describe, expect, it } from 'vitest';

import {
  isLimitReached,
  parseGuestUsage,
  seedGuestUsage,
} from '@/features/auth/login-required/utils/guest-usage-storage';

describe('parseGuestUsage', () => {
  it('null이면 모든 값이 0이다', () => {
    expect(parseGuestUsage(null)).toEqual({
      storylineCreate: 0,
      storyCreate: 0,
      chat: 0,
    });
  });

  it('정상 JSON은 그대로 읽는다', () => {
    expect(
      parseGuestUsage('{"storylineCreate":3,"storyCreate":1,"chat":2}'),
    ).toEqual({ storylineCreate: 3, storyCreate: 1, chat: 2 });
  });

  it('누락 필드는 0으로 보정한다', () => {
    expect(parseGuestUsage('{"chat":4}')).toEqual({
      storylineCreate: 0,
      storyCreate: 0,
      chat: 4,
    });
  });

  it('잘못된 JSON·비객체·음수·NaN·문자열은 0으로 본다', () => {
    expect(parseGuestUsage('not json')).toEqual({
      storylineCreate: 0,
      storyCreate: 0,
      chat: 0,
    });
    expect(parseGuestUsage('[]')).toEqual({
      storylineCreate: 0,
      storyCreate: 0,
      chat: 0,
    });
    expect(
      parseGuestUsage('{"storylineCreate":-2,"storyCreate":"x","chat":null}'),
    ).toEqual({ storylineCreate: 0, storyCreate: 0, chat: 0 });
  });
});

describe('seedGuestUsage', () => {
  it('storyCreate를 스토리 ID 개수까지 끌어올린다', () => {
    const seeded = seedGuestUsage(
      { storylineCreate: 0, storyCreate: 0, chat: 0 },
      1,
    );

    expect(seeded.storyCreate).toBe(1);
  });

  it('이미 카운터가 더 크면 유지한다', () => {
    const seeded = seedGuestUsage(
      { storylineCreate: 0, storyCreate: 3, chat: 0 },
      1,
    );

    expect(seeded.storyCreate).toBe(3);
  });

  it('storyCreate 외 다른 필드는 건드리지 않는다', () => {
    const seeded = seedGuestUsage(
      { storylineCreate: 5, storyCreate: 0, chat: 2 },
      4,
    );

    expect(seeded).toEqual({ storylineCreate: 5, storyCreate: 4, chat: 2 });
  });
});

describe('isLimitReached', () => {
  it('한도 미만이면 false, 한도 이상이면 true', () => {
    expect(
      isLimitReached('chat', { storylineCreate: 0, storyCreate: 0, chat: 4 }),
    ).toBe(false);
    expect(
      isLimitReached('chat', { storylineCreate: 0, storyCreate: 0, chat: 5 }),
    ).toBe(true);
    expect(
      isLimitReached('storyCreate', {
        storylineCreate: 0,
        storyCreate: 1,
        chat: 0,
      }),
    ).toBe(true);
    expect(
      isLimitReached('storylineCreate', {
        storylineCreate: 9,
        storyCreate: 0,
        chat: 0,
      }),
    ).toBe(false);
  });
});
