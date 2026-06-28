'use client';

import { Marker, MarkerContent } from '@/components/ui/marker';
import { type RevealHint, useRevealedHints } from '@/hooks/use-revealed-hint';
import { useTypewriter } from '@/hooks/use-typewriter';

const NO_HINTS: ReadonlyArray<RevealHint> = [];

type StoryGeneratingLoadingProps = {
  phrases: string[];
  label: string;
  hints?: ReadonlyArray<RevealHint>;
};

export function StoryGeneratingLoading({
  phrases,
  label,
  hints = NO_HINTS,
}: StoryGeneratingLoadingProps) {
  const text = useTypewriter(phrases);
  const revealedHints = useRevealedHints(hints);

  return (
    <div className="flex flex-col">
      <Marker role="status">
        <MarkerContent className="min-h-lh shimmer" aria-label={label}>
          {text}
        </MarkerContent>
      </Marker>

      <div aria-live="polite" className="flex flex-col">
        {revealedHints.map((hint) => (
          <div
            key={hint.delayMs}
            className="mt-4 flex animate-in flex-col gap-4 duration-500 fade-in">
            <Marker variant="separator">
              <MarkerContent className="text-foreground-tertiary">
                {Math.round(hint.delayMs / 1000)}초 지남
              </MarkerContent>
            </Marker>
            <Marker>
              <MarkerContent className="text-foreground-tertiary">
                {hint.text}
              </MarkerContent>
            </Marker>
          </div>
        ))}
      </div>
    </div>
  );
}
