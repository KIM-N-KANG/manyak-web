'use client';

import { useEffect, useRef, useState } from 'react';

import { resolveHeaderVisibility } from '../lib/resolve-header-visibility';
import type { StreamingTurn } from '../types';
import { useStickyScroll } from './use-sticky-scroll';

type UseChatMessageScrollParams = {
  turnCount: number;
  streamingTurn: StreamingTurn | null;
  onHeaderVisibleChange: (isVisible: boolean) => void;
};

export function useChatMessageScroll({
  turnCount,
  streamingTurn,
  onHeaderVisibleChange,
}: UseChatMessageScrollParams) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingBlockRef = useRef<HTMLDivElement>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const [hasSent, setHasSent] = useState(false);
  const [startedEmpty] = useState(() => turnCount === 0 && !streamingTurn);

  useEffect(() => {
    if (streamingTurn && !hasSent) {
      // 스트리밍을 한 번 본 뒤 마지막 턴의 화면 공간 예약을 유지한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSent(true);
    }
  }, [streamingTurn, hasSent]);

  const signature = `${turnCount}:${streamingTurn?.output.length ?? -1}`;
  const { isAtBottom, scrollToBottom, handleScroll } = useStickyScroll(
    scrollRef,
    signature,
    streamingTurn ? streamingBlockRef : hasSent ? lastTurnRef : null,
    streamingTurn ? 'smooth' : 'auto',
    !startedEmpty,
  );

  useEffect(() => {
    if (hasSent && startedEmpty) {
      scrollToBottom('smooth');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSent]);

  const handleMessageScroll = () => {
    handleScroll();

    const current = scrollRef.current?.scrollTop ?? 0;
    const delta = current - lastScrollTopRef.current;
    const nextVisible = resolveHeaderVisibility(current, delta);

    if (nextVisible !== null) {
      onHeaderVisibleChange(nextVisible);
    }

    lastScrollTopRef.current = current;
  };

  return {
    scrollRef,
    streamingBlockRef,
    lastTurnRef,
    hasSent,
    isAtBottom,
    scrollToBottom,
    handleMessageScroll,
  };
}
