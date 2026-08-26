'use client';

import Link from 'next/link';

import type { ChatShareTurnResponse } from '@/api/generated/models';
import { ManyakLogo } from '@/components/layout/manyak-logo';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import {
  AiMessageBubble,
  UserMessageBubble,
} from '@/features/chats/_shared/components/chat-message-bubble';
import { markOnboardingSeen } from '@/features/onboarding/utils/onboarding-storage';
import { track, useTrackOnView } from '@/observability/analytics';

/**
 * 공유 열람 화면의 입력.
 *
 * 채팅방과 같은 셸 구성이다. 헤더 / 스크롤 영역 / 하단 CTA를 모두 flex 컬럼의 in-flow
 * 형제로 두고 헤더와 CTA는 항상 고정한다. 오버레이로 얹으면 스크롤 컨테이너가 프레임
 * 끝까지 늘어나 스크롤바 트랙이 헤더·CTA 뒤로 깔린다.
 *
 * CTA는 스토리 생성 퍼널로 바로 보내면서 온보딩을 본 것으로 기록한다. 공유 링크로
 * 들어온 사람은 이 화면에서 이미 서비스가 무엇인지 보았으므로, 만들기를 누른 뒤
 * 홈으로 돌아왔을 때 온보딩을 다시 마주치지 않게 한다.
 *
 * 진입 시 화면 전체를 채팅방과 같은 150ms로 페이드인한다. 공유본은 클라이언트에서
 * 조회하므로 로딩 스피너가 이 화면으로 통째로 교체되는데, 그 전환을 그대로 두면
 * 화면이 툭 튀어나온다.
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
        <p className="p-4 text-center text-sm text-foreground-secondary">
          친구가 공유한 채팅을 보고 있어요
        </p>
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
          render={<Link href={APP_PATH.STUDIO.STORY.SIMPLE} />}
          onClick={() => {
            track('client_chatShare_ctaButton_clicked', { story_id: storyId });
            markOnboardingSeen();
          }}>
          나만의 스토리 만들고 채팅하기
        </Button>
      </footer>
    </div>
  );
}
