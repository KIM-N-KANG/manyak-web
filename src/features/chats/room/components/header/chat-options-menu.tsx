'use client';

import { useState } from 'react';

import { Alert02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import {
  OptionsMenu,
  type OptionsMenuItem,
} from '@/components/common/options-menu';
import { APP_PATH } from '@/constants/app-path';
import { useDeleteCreatedChat } from '@/features/chats/_shared/hooks/use-delete-created-chat';
import { StoryReportSheet } from '@/features/stories/_shared/components/story-report-sheet';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';

/**
 * 채팅방 헤더 더보기 메뉴의 props. 신고 대상은 이 채팅이 참조하는 스토리라 `storyId`를 받고,
 * 참조 스토리가 삭제돼 ID가 없으면 신고 항목을 두지 않는다(서버가 404로 거절한다).
 */
type ChatOptionsMenuProps = {
  chatId: string;
  storyId: string | null;
};

export function ChatOptionsMenu({ chatId, storyId }: ChatOptionsMenuProps) {
  const router = useRouter();
  const { status } = useSession();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { deleteChat, isPending } = useDeleteCreatedChat(chatId, () =>
    router.replace(APP_PATH.MAIN.CHATS),
  );
  const canReport = status === 'authenticated' && storyId !== null;

  const items: OptionsMenuItem[] = [];

  if (canReport) {
    items.push({
      icon: Alert02Icon,
      label: STORY_REPORT_COPY.action,
      onSelect: () => setIsReportOpen(true),
    });
  }

  items.push({
    icon: Delete02Icon,
    label: '삭제하기',
    variant: 'destructive',
    onSelect: deleteChat,
    confirm: { title: '채팅을 삭제할까요?', isPending },
  });

  return (
    <>
      <OptionsMenu
        triggerAriaLabel="채팅 옵션 더보기"
        size="icon"
        items={items}
      />
      {canReport && (
        <StoryReportSheet
          storyId={storyId}
          source="chat"
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
        />
      )}
    </>
  );
}
