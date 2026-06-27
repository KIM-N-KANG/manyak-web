'use client';

import { useEffect, useState } from 'react';

export type RevealHint = { delayMs: number; text: string };

/**
 * 경과 시간(ms) 기준으로 활성 문구를 고른다. 임계값을 넘긴 힌트 중 가장 늦은
 * delayMs를 가진 문구를 반환한다(= 교체 동작). 없으면 null.
 */
export function selectActiveHint(
  hints: ReadonlyArray<RevealHint>,
  elapsedMs: number,
): string | null {
  let active: string | null = null;

  for (const hint of hints) {
    if (elapsedMs >= hint.delayMs) {
      active = hint.text;
    }
  }

  return active;
}

/**
 * 마운트 시 각 임계값에 setTimeout을 걸어 도달한 최대 임계값을 추적하고,
 * selectActiveHint로 현재 문구를 계산해 반환한다. 언마운트 시 타이머 정리.
 * hints는 안정적 참조(모듈 상수)로 넘긴다.
 */
export function useRevealedHint(
  hints: ReadonlyArray<RevealHint>,
): string | null {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const timers = hints.map((hint) =>
      setTimeout(() => {
        setElapsedMs((prev) => Math.max(prev, hint.delayMs));
      }, hint.delayMs),
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [hints]);

  return selectActiveHint(hints, elapsedMs);
}
