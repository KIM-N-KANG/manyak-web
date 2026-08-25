'use client';

import { type ReactNode } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryCardGrid } from '@/features/stories/_shared/components/story-card-grid';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/observability/analytics';

import { CREATED_STORY_SECTION_TITLE } from '../constants';
import { useCreatedStories } from '../hooks/use-created-stories';
import { ContinueCreationBanner } from './continue-creation-banner';
import { CreateStoryButton } from './create-story-button';
import { CreatedStoryListSkeleton } from './created-story-list-skeleton';

export function CreatedStoryList() {
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const showSkeleton = useDelayedLoading(isLoading);

  let stateKey: string;
  let content: ReactNode;

  if (showSkeleton) {
    stateKey = 'skeleton';
    content = <CreatedStoryListSkeleton />;
  } else if (isLoading) {
    stateKey = 'pending';
    content = null;
  } else if (isError) {
    stateKey = 'error';
    content = (
      <RetryListStatus
        title="스토리를 불러오지 못했어요"
        onRetry={() => refetch()}
      />
    );
  } else if (isEmpty) {
    stateKey = 'empty';
    content = (
      <ListStatus
        title="아직 만든 스토리가 없어요"
        description="3단계로 간단하게 스토리를 만들어보세요">
        <Button
          nativeButton={false}
          render={
            <Link
              href={APP_PATH.CREATOR.STORY}
              onClick={() =>
                track('client_storyList_createButton_clicked', {
                  source: 'emptyState',
                })
              }
            />
          }
          size="lg">
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          <span>스토리 만들기</span>
        </Button>
      </ListStatus>
    );
  } else {
    stateKey = 'list';
    content = <StoryCardGrid stories={stories} section="created" />;
  }

  return (
    <>
      <ContinueCreationBanner />
      <section className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{CREATED_STORY_SECTION_TITLE}</h2>
          {stateKey === 'list' && <CreateStoryButton />}
        </div>
        <FadeStateSwitch
          stateKey={stateKey}
          className="flex min-h-0 flex-1 flex-col">
          {content}
        </FadeStateSwitch>
      </section>
    </>
  );
}
