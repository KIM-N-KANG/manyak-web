'use client';

import { m, useReducedMotion } from 'motion/react';

import { ImageGeneration } from '@/components/agents/image-generation';
import { ReasoningText } from '@/components/agents/loading-states/reasoning-text';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { Marker, MarkerContent } from '@/components/ui/marker';
import { EASE_OUT } from '@/lib/ease';

import { CHAT_STREAM_LOADING_COPY } from '../../constants';

/** 로딩 문구는 채팅 버블 본문과 같은 글꼴·크기·행간으로 그린다. */
const BUBBLE_TEXT_CLASS_NAME = 'font-maruburi text-base leading-7 font-normal';

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
          <TextShimmer duration={1.8} className={BUBBLE_TEXT_CLASS_NAME}>
            {CHAT_STREAM_LOADING_COPY.writing}
          </TextShimmer>
        </MarkerContent>
      </Marker>
    );
  }

  return (
    // 문구가 먼저 올라오고, 썸네일 자리가 한 박자 늦게 살짝 커지며 떠오른다.
    // 문구는 제작 퍼널 로딩과 같은 순환 표현(4초 전환·4초 쉬머)을 쓴다.
    <div role="status" className="flex flex-col gap-5">
      <m.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}>
        <ReasoningText
          phrases={[...CHAT_STREAM_LOADING_COPY.scenePhrases]}
          interval={4000}
          shimmerDuration={4}
          className={BUBBLE_TEXT_CLASS_NAME}
          aria-label={CHAT_STREAM_LOADING_COPY.sceneLabel}
        />
      </m.div>
      <m.div
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.15 }}>
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
    </div>
  );
}
