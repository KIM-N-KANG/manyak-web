'use client';

import { m } from 'motion/react';

import { ReasoningText } from '@/components/agents/loading-states/reasoning-text';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { type RevealHint, useRevealedHints } from '@/hooks/use-revealed-hints';

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
  const revealedHints = useRevealedHints(hints);

  return (
    <div className="flex flex-col">
      <ReasoningText
        phrases={phrases}
        interval={4000}
        shimmerDuration={4}
        className="text-base"
        aria-label={label}
      />

      <div aria-live="polite" className="flex flex-col">
        {revealedHints.map(({ hint, isTextRevealed }) => (
          <div key={hint.delayMs} className="mt-4 flex flex-col gap-4">
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}>
              <Marker variant="separator">
                <MarkerContent className="text-foreground-tertiary">
                  {Math.round(hint.delayMs / 1000)}초 지남
                </MarkerContent>
              </Marker>
            </m.div>
            {isTextRevealed && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}>
                <Marker>
                  <MarkerContent className="text-foreground-tertiary">
                    {hint.text}
                  </MarkerContent>
                </Marker>
              </m.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
