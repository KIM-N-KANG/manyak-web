'use client';

import Link from 'next/link';

import type { ChatShareTurnResponse } from '@/api/generated/models';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { ChatAiMessageContent } from '@/features/chats/_shared/components/chat-ai-message-content';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';
import { CHAT_AI_NOTICE } from '@/features/chats/_shared/constants/ai-notice';
import { track, useTrackOnView } from '@/observability/analytics';

type SharedChatViewProps = {
  storyId: string;
  storyTitle: string;
  /** 첫 AI 메시지로 보여 줄 프롤로그. 빈 문자열이면 그리지 않는다. */
  prologue: string;
  turns: ChatShareTurnResponse[];
};

/**
 * 공유된 채팅을 읽기 전용으로 보여 주고 간편 제작으로 이끄는 공유 열람 화면.
 *
 * @remarks
 * 채팅방과 같은 셸 구성이다. 헤더 / 스크롤 영역 / 하단 CTA를 모두 flex 컬럼의 in-flow
 * 형제로 두고 헤더와 CTA는 항상 고정한다. 오버레이로 얹으면 스크롤 컨테이너가 프레임
 * 끝까지 늘어나 스크롤바 트랙이 헤더와 CTA 뒤로 깔린다.
 *
 * 진입 시 화면 전체를 채팅방과 같은 150ms로 페이드인한다. 공유본은 클라이언트에서
 * 조회하므로 로딩 스피너가 이 화면으로 통째로 교체되는데, 그 전환을 그대로 두면
 * 화면이 툭 튀어나온다.
 */
export function SharedChatView({
  storyId,
  storyTitle,
  prologue,
  turns,
}: SharedChatViewProps) {
  useTrackOnView('client_chatShare_viewed', { story_id: storyId });

  return (
    <div className="flex h-full min-h-0 animate-in flex-col duration-150 fade-in-0">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background px-4">
        <Link
          href={APP_PATH.MAIN.STORIES}
          aria-label="홈 화면으로 이동"
          className="mr-2 shrink-0">
          <ManyakLogo className="h-6 w-auto text-primary" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-semibold">{storyTitle}</h1>
      </header>

      <div className="min-h-0 flex-1 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain pb-2">
        <p className="px-4 text-center text-xs text-foreground-secondary">
          {CHAT_AI_NOTICE}
        </p>
        {prologue ? (
          <AiMessageBubble>
            <ChatAiMessageContent content={prologue} />
          </AiMessageBubble>
        ) : null}
        {turns.map((turn, index) => (
          <div key={turn.createdAt ?? index}>
            {turn.userInput ? (
              <UserMessageBubble>{turn.userInput}</UserMessageBubble>
            ) : null}
            {turn.aiOutput ? (
              <AiMessageBubble>
                <ChatAiMessageContent
                  content={turn.aiOutput}
                  onCharacterImageZoom={() =>
                    track('client_chatShare_characterImage_clicked', {
                      story_id: storyId,
                    })
                  }
                />
              </AiMessageBubble>
            ) : null}
          </div>
        ))}
      </div>

      <footer className="flex shrink-0 flex-col bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          nativeButton={false}
          size="lg"
          className="w-full"
          render={<Link href={APP_PATH.STUDIO.STORY.SIMPLE} />}
          onClick={() => {
            track('client_chatShare_ctaButton_clicked', { story_id: storyId });
          }}>
          나만의 스토리 만들고 채팅하기
        </Button>
      </footer>
    </div>
  );
}
