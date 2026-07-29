'use client';

import Link from 'next/link';

import type { ChatShareTurnResponse } from '@/api/generated/models';
import { HomeOutlineIcon } from '@/components/icons/home-outline-icon';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';
import { track, useTrackOnView } from '@/observability/analytics';

/**
 * 공유 열람 화면의 입력.
 *
 * 채팅방과 같은 셸 구성이다. 헤더 / 스크롤 영역 / 하단 CTA를 모두 flex 컬럼의 in-flow
 * 형제로 두고 헤더와 CTA는 항상 고정한다. 오버레이로 얹으면 스크롤 컨테이너가 프레임
 * 끝까지 늘어나 스크롤바 트랙이 헤더·CTA 뒤로 깔린다.
 */
type SharedChatViewProps = {
  storyId: string;
  storyTitle: string;
  prologue: string;
  turns: ChatShareTurnResponse[];
};

export function SharedChatView({
  storyId,
  storyTitle,
  prologue,
  turns,
}: SharedChatViewProps) {
  useTrackOnView('client_chatShare_viewed', { story_id: storyId });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
        <ManyakLogo className="mr-2 h-6 w-auto shrink-0 text-primary" />
        <h1 className="min-w-0 flex-1 truncate font-semibold">{storyTitle}</h1>
        <Button
          nativeButton={false}
          size="icon"
          variant="ghost"
          aria-label="홈 화면으로 이동 버튼"
          render={<Link href={APP_PATH.MAIN.STORIES} />}>
          <HomeOutlineIcon aria-hidden="true" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain">
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

      <footer className="flex shrink-0 flex-col bg-background px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          nativeButton={false}
          size="lg"
          className="w-full"
          render={<Link href={APP_PATH.MAIN.STORIES} />}
          onClick={() =>
            track('client_chatShare_ctaButton_clicked', { story_id: storyId })
          }>
          마냑에서 내 스토리 만들기
        </Button>
      </footer>
    </div>
  );
}
