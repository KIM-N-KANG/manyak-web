'use client';

import { ShimmerText } from '@/components/ui/shimmer-text';
import { type RevealHint, useRevealedHint } from '@/hooks/use-revealed-hint';
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
  const hint = useRevealedHint(hints);

  return (
    <div className="flex flex-col">
      <span
        className="text-sm leading-loose text-foreground-secondary"
        aria-label={label}
        aria-live="polite">
        {text}
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1.1em] w-[0.5em] translate-y-[0.15em] animate-caret-blink bg-foreground-secondary"
        />
      </span>

      <div aria-live="polite">
        {hint && (
          <span
            key={hint}
            className="mt-2 block animate-in duration-500 fade-in">
            <ShimmerText className="text-sm leading-loose">{hint}</ShimmerText>
          </span>
        )}
      </div>
    </div>
  );
}
