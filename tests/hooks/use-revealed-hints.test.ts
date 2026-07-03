import { describe, expect, it } from 'vitest';

import {
  type RevealHint,
  selectRevealedHints,
} from '@/hooks/use-revealed-hints';

const STORY_HINTS: RevealHint[] = [
  { delayMs: 30000, text: '생각보다 시간이 조금 더 걸리고 있어요' },
  { delayMs: 60000, text: '거의 다 완성됐어요' },
];

describe('selectRevealedHints', () => {
  it('힌트가 없으면 빈 배열을 반환한다', () => {
    expect(selectRevealedHints([], 99999)).toEqual([]);
  });

  it('첫 임계값 도달 전에는 빈 배열을 반환한다', () => {
    expect(selectRevealedHints(STORY_HINTS, 29999)).toEqual([]);
  });

  it('임계값 경계(elapsed === delayMs)에서 해당 문구가 포함된다', () => {
    expect(selectRevealedHints(STORY_HINTS, 30000)).toEqual([STORY_HINTS[0]]);
  });

  it('첫 구간(30~60초)에서는 첫 문구만 반환한다', () => {
    expect(selectRevealedHints(STORY_HINTS, 45000)).toEqual([STORY_HINTS[0]]);
  });

  it('두 번째 임계값 이후에는 두 문구가 모두 누적된다', () => {
    expect(selectRevealedHints(STORY_HINTS, 60000)).toEqual(STORY_HINTS);
    expect(selectRevealedHints(STORY_HINTS, 120000)).toEqual(STORY_HINTS);
  });

  it('단일 힌트(스토리라인 15초)도 동작한다', () => {
    const hints: RevealHint[] = [
      { delayMs: 15000, text: '생각보다 시간이 조금 더 걸리고 있어요' },
    ];

    expect(selectRevealedHints(hints, 14999)).toEqual([]);
    expect(selectRevealedHints(hints, 15000)).toEqual(hints);
  });
});
