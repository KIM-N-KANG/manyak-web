'use client';

import { Fragment } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_PATH } from '@/constants/app-path';
import {
  ONBOARDING_TARGET,
  ONBOARDING_TOURS,
} from '@/features/onboarding/constants';
import { useStartOnboarding } from '@/features/onboarding/use-onboarding-tour';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

import { ListStatus } from '../../../../components/common/list-status';
import { useCreatedStories } from '../hooks/use-created-stories';
import { CreateStoryFab } from './create-story-fab';
import { StoryCard } from './story-card';
import { StoryListSkeleton } from './story-list-skeleton';

export function StoryList() {
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const showSkeleton = useDelayedLoading(isLoading);

  const isCreateTargetReady = !showSkeleton && !isLoading && !isError;

  useStartOnboarding(ONBOARDING_TOURS.STORY_LIST, isCreateTargetReady);

  if (showSkeleton) {
    return <StoryListSkeleton />;
  }

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <ListStatus
        title="스토리를 불러오지 못했어요"
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
        title="아직 만든 스토리가 없어요"
        description="3단계로 간단하게 스토리를 만들어보세요">
        <Button
          nativeButton={false}
          render={
            <Link
              href={APP_PATH.CREATOR.STORY}
              data-onborda={ONBOARDING_TARGET.CREATE_STORY}
            />
          }
          size="lg">
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          <span>스토리 만들기</span>
        </Button>
      </ListStatus>
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
