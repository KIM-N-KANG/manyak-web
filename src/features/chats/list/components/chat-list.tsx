'use client';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { useHasCreatedStories } from '@/features/stories/_shared/hooks/use-has-created-stories';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useTrackOnView } from '@/observability/analytics';

import { useCreatedChats } from '../hooks/use-created-chats';
import { ChatCard } from './chat-card';
import { ChatListSkeleton } from './chat-list-skeleton';

export function ChatList() {
  useTrackOnView('client_chatList_viewed');

  const { chats, isLoading, isError, isEmpty, refetch } = useCreatedChats();
  const hasStories = useHasCreatedStories();
  const showSkeleton = useDelayedLoading(isLoading);

  if (showSkeleton) {
    return <ChatListSkeleton />;
  }

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <RetryListStatus
        title="채팅을 불러오지 못했어요"
        onRetry={() => refetch()}
      />
    );
  }

  if (isEmpty) {
    return (
      <ListStatus
        title="아직 진행중인 채팅이 없어요"
        description={
          hasStories
            ? '스토리를 선택해서 채팅으로 이어가보세요'
            : '스토리를 만든 후 채팅으로 이야기를 이어가보세요'
        }>
        {hasStories ? (
          <Button
            nativeButton={false}
            render={<Link href={APP_PATH.MAIN.STUDIO} />}
            size="lg">
            스토리 목록으로 가기
          </Button>
        ) : (
          <Button
            nativeButton={false}
            render={<Link href={APP_PATH.STUDIO.STORY.SIMPLE} />}
            size="lg">
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            <span>스토리 만들기</span>
          </Button>
        )}
      </ListStatus>
    );
  }

  return (
    <ul className="flex flex-col pb-2">
      {chats.map((chat, index) => (
        <li key={chat.id}>
          <ChatCard chat={chat} position={index} />
        </li>
      ))}
    </ul>
  );
}
