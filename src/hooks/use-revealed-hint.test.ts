import { describe, expect, it } from 'vitest';

import { type RevealHint, selectActiveHint } from './use-revealed-hint';

const STORY_HINTS: RevealHint[] = [
  { delayMs: 30000, text: '생각보다 시간이 조금 더 걸리고 있어요' },
  { delayMs: 60000, text: '거의 다 완성됐어요' },
];

describe('selectActiveHint', () => {
  it('힌트가 없으면 null을 반환한다', () => {
    expect(selectActiveHint([], 99999)).toBeNull();
  });

  it('첫 임계값 도달 전에는 null을 반환한다', () => {
    expect(selectActiveHint(STORY_HINTS, 29999)).toBeNull();
  });

  it('임계값 경계(elapsed === delayMs)에서 해당 문구를 반환한다', () => {
    expect(selectActiveHint(STORY_HINTS, 30000)).toBe(
      '생각보다 시간이 조금 더 걸리고 있어요',
    );
  });

  it('첫 구간(30~60초)에서는 첫 문구를 반환한다', () => {
    expect(selectActiveHint(STORY_HINTS, 45000)).toBe(
      '생각보다 시간이 조금 더 걸리고 있어요',
    );
  });

  it('두 번째 임계값 이후에는 둘째 문구로 교체된다', () => {
    expect(selectActiveHint(STORY_HINTS, 60000)).toBe('거의 다 완성됐어요');
    expect(selectActiveHint(STORY_HINTS, 120000)).toBe('거의 다 완성됐어요');
  });

  it('단일 힌트(스토리라인 15초)도 동작한다', () => {
    const hints: RevealHint[] = [
      { delayMs: 15000, text: '생각보다 시간이 조금 더 걸리고 있어요' },
    ];

    expect(selectActiveHint(hints, 14999)).toBeNull();
    expect(selectActiveHint(hints, 15000)).toBe(
      '생각보다 시간이 조금 더 걸리고 있어요',
    );
  });
});
