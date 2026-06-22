'use client';

import { useTypewriter } from '@/hooks/use-typewriter';

type StoryGeneratingLoadingProps = {
  phrases: string[];
  label: string;
};

export function StoryGeneratingLoading({
  phrases,
  label,
}: StoryGeneratingLoadingProps) {
  const text = useTypewriter(phrases);

  return (
    <span
      className="font-maruburi text-foreground-secondary"
      aria-label={label}
      aria-live="polite">
      {text}
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-[1.1em] w-[0.5em] translate-y-[0.15em] animate-caret-blink bg-foreground-secondary"
      />
    </span>
  );
}
