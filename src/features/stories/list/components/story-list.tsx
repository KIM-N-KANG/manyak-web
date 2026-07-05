'use client';

import { Fragment, type ReactNode, useEffect } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m } from 'motion/react';
import Link from 'next/link';

import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_PATH } from '@/constants/app-path';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/observability/analytics';

import { useCreatedStories } from '../hooks/use-created-stories';
import { CreateStoryFab } from './create-story-fab';
import { StoryCard } from './story-card';
import { StoryListSkeleton } from './story-list-skeleton';

const fadeProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export function StoryList() {
  useEffect(() => {
    track('client_storyList_viewed');
  }, []);

  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
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
        <ul className="flex flex-col">
          {stories.map((story, index) => (
            <Fragment key={story.id}>
              <li>
                <StoryCard story={story} position={index} />
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

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={stateKey}
        className="flex min-h-0 flex-1 flex-col"
        {...fadeProps}>
        {content}
      </m.div>
    </AnimatePresence>
  );
}
