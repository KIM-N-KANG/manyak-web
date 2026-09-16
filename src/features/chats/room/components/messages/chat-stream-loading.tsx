'use client';

import { m, useReducedMotion } from 'motion/react';

import { ImageGeneration } from '@/components/agents/image-generation';
import { ReasoningText } from '@/components/agents/loading-states/reasoning-text';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { EASE_OUT } from '@/lib/ease';

import { CHAT_STREAM_LOADING_COPY } from '../../constants';

type ChatStreamLoadingProps = {
  /** 실시간 이미지가 켜진 턴이면 4:3 장면 썸네일 자리를 문구 위에 함께 보인다 */
  realtimeImage?: boolean;
};

export function ChatStreamLoading({ realtimeImage }: ChatStreamLoadingProps) {
  const reduce = useReducedMotion();

  if (!realtimeImage) {
    return (
      <Marker role="status">
        <MarkerContent
          className="min-h-lh"
          aria-label={CHAT_STREAM_LOADING_COPY.writingLabel}>
          <TextShimmer duration={1.8} className="font-maruburi">
            {CHAT_STREAM_LOADING_COPY.writing}
          </TextShimmer>
        </MarkerContent>
      </Marker>
    );
  }

  return (
    // 썸네일 자리가 먼저 살짝 커지며 떠오르고, 문구가 한 박자 늦게 따라 올라온다.
    // 문구는 제작 퍼널 로딩과 같은 순환 표현(4초 전환·4초 쉬머)을 쓴다.
    <div role="status" className="flex flex-col gap-5">
      <m.div
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}>
        <ImageGeneration
          status="generating"
          label={CHAT_STREAM_LOADING_COPY.sceneLabel}
          aspectRatio="4 / 3"
          size="fluid"
          showStatus={false}
          resolution=""
          className="overflow-hidden rounded-xl border border-border bg-muted"
        />
      </m.div>
      <m.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}>
        <ReasoningText
          phrases={[...CHAT_STREAM_LOADING_COPY.scenePhrases]}
          interval={4000}
          shimmerDuration={4}
          aria-label={CHAT_STREAM_LOADING_COPY.sceneLabel}
        />
      </m.div>
    </div>
  );
}
