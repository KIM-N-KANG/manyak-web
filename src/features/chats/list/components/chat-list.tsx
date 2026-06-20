'use client';

import { Fragment } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { ListStatus } from '@/components/common/list-status';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_PATH } from '@/constants/app-path';

import { useChats } from '../hooks/use-chats';
import { ChatCard } from './chat-card';
import { ChatListSkeleton } from './chat-list-skeleton';

export function ChatList() {
  const { chats, isLoading, isError, isEmpty, refetch } = useChats();

  if (isLoading) {
    return <ChatListSkeleton />;
  }

  if (isError) {
    return (
      <ListStatus
        title="채팅을 불러오지 못했어요"
        description="잠시 후 다시 시도해주세요">
        <Button variant="outline" size="lg" onClick={() => refetch()}>
          다시 시도
        </Button>
      </ListStatus>
    );
  }

  if (isEmpty) {
    return (
      <ListStatus
        title="아직 진행중인 채팅이 없어요"
        description="스토리를 만든 후 채팅으로 이야기를 이어가보세요">
        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.CREATOR.STORY} />}
          size="lg">
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          <span>스토리 만들기</span>
        </Button>
      </ListStatus>
    );
  }

  return (
    <ul className="flex flex-col gap-2 py-4">
      {chats.map((chat, index) => (
        <Fragment key={chat.id}>
          <li>
            <ChatCard chat={chat} />
          </li>
          {index < chats.length - 1 && (
            <Separator className="mx-4 data-horizontal:w-auto" />
          )}
        </Fragment>
      ))}
    </ul>
  );
}
