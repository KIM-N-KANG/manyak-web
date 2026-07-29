'use client';

import Link from 'next/link';

import { ListStatus } from '@/components/common/list-status';
import { PageLoadingSpinner } from '@/components/common/page-loading-spinner';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

import { useSharedChat } from '../hooks/use-shared-chat';
import { SharedChatView } from './shared-chat-view';

type SharedChatScreenProps = {
  shareId: string;
};

export function SharedChatScreen({ shareId }: SharedChatScreenProps) {
  const {
    storyTitle,
    prologue,
    turns,
    isLoading,
    isError,
    isNotFound,
    refetch,
  } = useSharedChat(shareId);

  if (isLoading) {
    return <PageLoadingSpinner aria-label="공유된 채팅을 불러오는 중" />;
  }

  if (isNotFound) {
    return (
      <ListStatus
        title="링크를 찾을 수 없어요"
        description="삭제되었거나 잘못된 링크예요">
        <Button
          nativeButton={false}
          variant="outline"
          size="lg"
          render={<Link href={APP_PATH.MAIN.STORIES} />}>
          마냑 둘러보기
        </Button>
      </ListStatus>
    );
  }

  if (isError) {
    return (
      <RetryListStatus
        title="채팅을 불러오지 못했어요"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <SharedChatView
      shareId={shareId}
      storyTitle={storyTitle}
      prologue={prologue}
      turns={turns}
    />
  );
}
