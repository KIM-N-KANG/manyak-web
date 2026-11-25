'use client';

import { m } from 'motion/react';

import { ReasoningText } from '@/components/agents/loading-states/reasoning-text';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { type RevealHint, useRevealedHints } from '@/hooks/use-revealed-hints';

const NO_HINTS: ReadonlyArray<RevealHint> = [];

type StoryGeneratingLoadingProps = {
  /** 4초마다 돌아가며 보이는 진행 문구 */
  phrases: string[];
  label: string;
  /** 로딩이 길어질 때 덧붙이는 안내. `delayMs`는 이 컴포넌트가 마운트된 뒤 경과 시간(ms)이다. */
  hints?: ReadonlyArray<RevealHint>;
};

/**
 * 스토리라인 생성과 스토리 완성의 로딩 문구. 진행 문구를 돌려 보이고, 시간이 지나면 경과 시간 구분선과 안내를
 * 차례로 덧붙인다.
 */
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
