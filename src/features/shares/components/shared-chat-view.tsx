'use client';

import { type PointerEvent, useRef, useState } from 'react';

import Link from 'next/link';

import type { ChatShareTurnResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';
import { cn } from '@/lib/utils';
import { track, useTrackOnView } from '@/observability/analytics';

import { isTap } from '../utils/tap-gesture';

/**
 * 공유 열람 화면의 입력.
 *
 * 헤더와 CTA는 스크롤 영역 위에 absolute 오버레이로 얹는다. 앱 프레임 안에서는
 * fixed를 쓸 수 없고(조상에 transform이 생기면 기준이 조용히 깨진다), in-flow로 두면
 * 본문에 헤더 높이만큼 패딩 매직 넘버를 넣어야 하기 때문이다.
 *
 * 숨김 상태에는 inert를 함께 걸어 화면에서 사라진 CTA가 키보드 포커스를 먹지 않게
 * 한다. opacity만으로는 여전히 탭 순서에 남는다.
 */
type SharedChatViewProps = {
  shareId: string;
  storyTitle: string;
  prologue: string;
  turns: ChatShareTurnResponse[];
};

export function SharedChatView({
  shareId,
  storyTitle,
  prologue,
  turns,
}: SharedChatViewProps) {
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const pointerStart = useRef<{ x: number; y: number; at: number } | null>(
    null,
  );

  useTrackOnView('client_share_viewed', { share_id: shareId });

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = {
      x: event.clientX,
      y: event.clientY,
      at: event.timeStamp,
    };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;

    pointerStart.current = null;

    if (
      start &&
      isTap({
        dx: event.clientX - start.x,
        dy: event.clientY - start.y,
        elapsedMs: event.timeStamp - start.at,
      })
    ) {
      setIsChromeVisible((visible) => !visible);
    }
  };

  const chromeClassName = cn(
    'absolute inset-x-0 z-10 bg-background/95 px-4 transition-opacity duration-200',
    !isChromeVisible && 'pointer-events-none opacity-0',
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-18 pb-28"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}>
        {prologue ? <AiMessageBubble>{prologue}</AiMessageBubble> : null}
        {turns.map((turn, index) => (
          <div key={turn.createdAt ?? index}>
            {turn.userInput ? (
              <UserMessageBubble>{turn.userInput}</UserMessageBubble>
            ) : null}
            {turn.aiOutput ? (
              <AiMessageBubble>{turn.aiOutput}</AiMessageBubble>
            ) : null}
          </div>
        ))}
      </div>

      <header
        className={cn(chromeClassName, 'top-0 py-4')}
        inert={!isChromeVisible}>
        <h1 className="truncate text-center font-semibold">{storyTitle}</h1>
      </header>

      <div
        className={cn(chromeClassName, 'bottom-0 py-4')}
        inert={!isChromeVisible}>
        <Button
          nativeButton={false}
          size="lg"
          className="w-full"
          render={<Link href={APP_PATH.MAIN.STORIES} />}
          onClick={() =>
            track('client_share_ctaButton_clicked', { share_id: shareId })
          }>
          마냑에서 내 스토리 만들기
        </Button>
      </div>
    </div>
  );
}
