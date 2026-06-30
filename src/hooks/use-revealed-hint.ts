'use client';

import { useEffect, useState } from 'react';

export type RevealHint = { delayMs: number; text: string };

export type RevealedHint = {
  hint: RevealHint;
  isTextRevealed: boolean;
};

const TEXT_REVEAL_MIN_OFFSET_MS = 1000;
const TEXT_REVEAL_MAX_OFFSET_MS = 2000;

function randomTextRevealOffsetMs(): number {
  const span = TEXT_REVEAL_MAX_OFFSET_MS - TEXT_REVEAL_MIN_OFFSET_MS;

  return TEXT_REVEAL_MIN_OFFSET_MS + Math.floor(Math.random() * (span + 1));
}

export function selectRevealedHints(
  hints: ReadonlyArray<RevealHint>,
  elapsedMs: number,
): ReadonlyArray<RevealHint> {
  return hints.filter((hint) => elapsedMs >= hint.delayMs);
}

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
