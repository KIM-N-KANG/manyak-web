'use client';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useTrackOnView } from '@/observability/analytics';

import { CHAT_LIST_COPY } from '../constants';
import { useCreatedChats } from '../hooks/use-created-chats';
import { ChatCard } from './chat-card';
import { ChatListSkeleton } from './chat-list-skeleton';

export function ChatList() {
  useTrackOnView('client_chatList_viewed');

  const { chats, isLoading, isError, isEmpty, refetch } = useCreatedChats();
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
    return <EmptyListNotice>{CHAT_LIST_COPY.emptyTitle}</EmptyListNotice>;
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
