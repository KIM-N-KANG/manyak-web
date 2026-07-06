'use client';

import { useEffect, useState } from 'react';

/** 지정한 지연 시간 후에 노출할 힌트 */
export type RevealHint = { delayMs: number; text: string };

/** 노출된 힌트와 텍스트 공개 여부 */
export type RevealedHint = {
  hint: RevealHint;
  /** 힌트 노출 후 랜덤 오프셋이 지나 텍스트까지 공개되었는지 여부 */
  isTextRevealed: boolean;
};

const TEXT_REVEAL_MIN_OFFSET_MS = 1000;
const TEXT_REVEAL_MAX_OFFSET_MS = 2000;

function randomTextRevealOffsetMs(): number {
  const span = TEXT_REVEAL_MAX_OFFSET_MS - TEXT_REVEAL_MIN_OFFSET_MS;

  return TEXT_REVEAL_MIN_OFFSET_MS + Math.floor(Math.random() * (span + 1));
}

/** 경과 시간(elapsedMs)이 지연 시간을 넘긴 힌트만 골라 반환한다. */
export function selectRevealedHints(
  hints: ReadonlyArray<RevealHint>,
  elapsedMs: number,
): ReadonlyArray<RevealHint> {
  return hints.filter((hint) => elapsedMs >= hint.delayMs);
}

/**
 * 각 힌트를 delayMs가 지난 시점에 순차적으로 노출하는 훅.
 * 텍스트는 힌트 노출 후 1~2초의 랜덤 오프셋을 두고 추가로 공개된다.
 */
export function useRevealedHints(
  hints: ReadonlyArray<RevealHint>,
): ReadonlyArray<RevealedHint> {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [revealedTexts, setRevealedTexts] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  useEffect(() => {
    const timers = hints.flatMap((hint, index) => [
      setTimeout(() => {
        setElapsedMs((prev) => Math.max(prev, hint.delayMs));
      }, hint.delayMs),
      setTimeout(() => {
        setRevealedTexts((prev) => new Set(prev).add(index));
      }, hint.delayMs + randomTextRevealOffsetMs()),
    ]);

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [hints]);

  return selectRevealedHints(hints, elapsedMs).map((hint) => ({
    hint,
    isTextRevealed: revealedTexts.has(hints.indexOf(hint)),
  }));
}
