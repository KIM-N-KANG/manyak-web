'use client';

import { type ReactNode, useEffect } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/observability/analytics';

import { STORY_SECTION_TITLE } from '../constants';
import { useCreatedStories } from '../hooks/use-created-stories';
import { useOriginalStories } from '../hooks/use-original-stories';
import { ContinueCreationBanner } from './continue-creation-banner';
import { CreateStoryFab } from './create-story-fab';
import { StoryListSkeleton } from './story-list-skeleton';
import { StorySection } from './story-section';

export function StoryList() {
  useEffect(() => {
    track('client_storyList_viewed');
  }, []);

  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const originalStories = useOriginalStories();
  const showSkeleton = useDelayedLoading(isLoading);

  let stateKey: string;
  let content: ReactNode;

  if (showSkeleton) {
    stateKey = 'skeleton';
    content = <StoryListSkeleton />;
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
    content = (
      <>
        <StorySection
          title={STORY_SECTION_TITLE.CREATED}
          stories={stories}
          section="created"
        />
        <CreateStoryFab />
      </>
    );
  }

  return (
    <>
      <ContinueCreationBanner />
      {/* 오리지널은 보조 콘텐츠다. 로딩·실패·빈 배열(공식 계정 미설정)에서는 자리를 만들지 않고 접는다. */}
      {originalStories.length > 0 && (
        <StorySection
          title={STORY_SECTION_TITLE.ORIGINAL}
          stories={originalStories}
          section="original"
        />
      )}
      <FadeStateSwitch
        stateKey={stateKey}
        className="flex min-h-0 flex-1 flex-col">
        {content}
      </FadeStateSwitch>
    </>
  );
}
