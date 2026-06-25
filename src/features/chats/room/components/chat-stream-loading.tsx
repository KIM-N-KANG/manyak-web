'use client';

import { useTypewriter } from '@/hooks/use-typewriter';

const LOADING_PHRASES = ['.....', '.....', '.....'];

export function ChatStreamLoading() {
  const text = useTypewriter(LOADING_PHRASES);

  return (
    <p
      className="text-sm leading-loose text-foreground-secondary"
      aria-label="답변을 작성하고 있어요"
      aria-live="polite">
      {text}
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-[1.1em] w-[0.5em] translate-y-[0.15em] animate-caret-blink bg-foreground-secondary"
      />
    </p>
  );
}
