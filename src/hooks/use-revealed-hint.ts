'use client';

import { useEffect, useState } from 'react';

export type RevealHint = { delayMs: number; text: string };

export function selectRevealedHints(
  hints: ReadonlyArray<RevealHint>,
  elapsedMs: number,
): ReadonlyArray<RevealHint> {
  return hints.filter((hint) => elapsedMs >= hint.delayMs);
}

export function useRevealedHints(
  hints: ReadonlyArray<RevealHint>,
): ReadonlyArray<RevealHint> {
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

  return selectRevealedHints(hints, elapsedMs);
}
