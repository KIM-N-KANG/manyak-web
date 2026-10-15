'use client';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { SPRING_LAYOUT } from '@/lib/ease';
import { useTrackOnView } from '@/observability/analytics';

import { CHAT_LIST_COPY } from '../constants';
import { useCreatedChats } from '../hooks/use-created-chats';
import { ChatCard } from './chat-card';
import { ChatListSkeleton } from './chat-list-skeleton';

export function ChatList() {
  useTrackOnView('client_chatList_viewed');

  const { chats, isLoading, isError, isEmpty, refetch } = useCreatedChats();
  const showSkeleton = useDelayedLoading(isLoading);
  const shouldReduceMotion = useReducedMotion();

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

  // 최근 대화한 채팅이 맨 위로 오를 때 카드가 순간이동하지 않고 미끄러져 자리를 옮긴다.
  // 위 행일수록 앞에 쌓아 오르는 카드가 내려가는 카드를 불투명하게 덮고 지나가게 한다.
  return (
    <ul className="relative isolate flex flex-col pb-2">
      <AnimatePresence mode="popLayout" initial={false}>
        {chats.map((chat, index) => (
          <m.li
            key={chat.id}
            layout={shouldReduceMotion ? false : 'position'}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.2,
              ease: 'easeOut',
              layout: SPRING_LAYOUT,
            }}
            style={{ zIndex: chats.length - index }}
            className="bg-background">
            <ChatCard chat={chat} position={index} />
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
