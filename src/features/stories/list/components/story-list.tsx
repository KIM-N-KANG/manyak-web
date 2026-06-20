'use client';

import { Fragment } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_PATH } from '@/constants/app-path';

import { useCreatedStories } from '../hooks/use-created-stories';
import { CreateStoryFab } from './create-story-fab';
import { StoryCard } from './story-card';
import { StoryListSkeleton } from './story-list-skeleton';
import { StoryListStatus } from './story-list-status';

export function StoryList() {
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();

  if (isLoading) {
    return <StoryListSkeleton />;
  }

  if (isError) {
    return (
      <StoryListStatus
        title="스토리를 불러오지 못했어요"
        description="잠시 후 다시 시도해주세요">
        <Button variant="outline" size="lg" onClick={() => refetch()}>
          다시 시도
        </Button>
      </StoryListStatus>
    );
  }

  if (isEmpty) {
    return (
      <StoryListStatus
        title="아직 만든 스토리가 없어요"
        description="3단계로 간단하게 스토리를 만들어보세요">
        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.CREATOR.STORY} />}
          size="lg">
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          <span>스토리 만들기</span>
        </Button>
      </StoryListStatus>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2 py-4">
        {stories.map((story, index) => (
          <Fragment key={story.id}>
            <li>
              <StoryCard story={story} />
            </li>
            {index < stories.length - 1 && (
              <Separator className="mx-4 data-horizontal:w-auto" />
            )}
          </Fragment>
        ))}
      </ul>
      <CreateStoryFab />
    </>
  );
}
