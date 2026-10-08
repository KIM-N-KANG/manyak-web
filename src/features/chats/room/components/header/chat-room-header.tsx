'use client';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { DELETED_STORY_LABEL } from '@/features/chats/_shared/constants/deleted-story';
import { buildChatPersonaLabel } from '@/features/chats/room/constants';
import { cn } from '@/lib/utils';

import { ChatMenuDrawer } from './chat-menu-drawer';

type ChatRoomHeaderProps = {
  chatId: string;
  /** 참조 스토리 ID. 스토리가 삭제되면 null */
  storyId: string | null;
  storyTitle: string;
  /** 페르소나로 시작한 채팅의 페르소나 이름. 기본 주인공이면 null */
  personaName: string | null;
  turnCount: number;
  /** 메시지 영역 탭으로 헤더를 숨겼는지 여부 */
  hidden: boolean;
};

/**
 * 채팅방 헤더. 메시지 영역 위에 떠 있어 탭으로 페이드아웃·인해도 메시지 영역 높이와 스크롤 위치가 바뀌지 않는다.
 * 높이는 채팅방 루트의 `--chat-header-height`를 따르고, 메시지 목록은 같은 값만큼 위 여백을 둬 첫 메시지를 가리지 않는다.
 */
export function ChatRoomHeader({
  chatId,
  storyId,
  storyTitle,
  personaName,
  turnCount,
  hidden,
}: ChatRoomHeaderProps) {
  const router = useRouter();

  const goBack = () => router.push(APP_PATH.MAIN.CHATS);

  return (
    <header
      className={cn(
        'absolute inset-x-0 top-0 z-10 flex h-(--chat-header-height) items-center gap-2 bg-background px-2 transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none',
        hidden && 'invisible opacity-0',
      )}>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="채팅 목록으로 돌아가기 버튼"
        onClick={goBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
      </Button>
      <div className="flex min-w-0 flex-1 flex-col">
        <h1
          className={cn(
            'truncate font-semibold',
            storyId === null && 'text-foreground-tertiary',
          )}>
          {storyId === null ? DELETED_STORY_LABEL : storyTitle}
        </h1>
        {personaName && (
          <p className="truncate text-xs text-foreground-secondary">
            {buildChatPersonaLabel(personaName)}
          </p>
        )}
      </div>
      <ChatMenuDrawer chatId={chatId} storyId={storyId} turnCount={turnCount} />
    </header>
  );
}
