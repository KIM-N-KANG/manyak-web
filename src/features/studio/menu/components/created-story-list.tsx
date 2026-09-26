'use client';

import { type MouseEvent, type ReactNode, useEffect } from 'react';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { APP_PATH } from '@/constants/app-path';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import { takeStoryCompletionRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/observability/analytics';

import { CREATED_STORY_LIST_COPY } from '../constants';
import { useCreatedStories } from '../hooks/use-created-stories';
import { useCreationRecords } from '../hooks/use-pending-creation-request';
import { CreateStoryFab } from './create-story-fab';
import { CreatedStoryCard } from './created-story-card';
import { CreatedStoryListSkeleton } from './created-story-list-skeleton';
import { CreationProgressCard } from './creation-progress-card';

export function CreatedStoryList() {
  const router = useRouter();
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const local = useCreationRecords();
  const pendingCreationRecords = local.pending ?? [];
  const completionRecords = local.completions ?? [];
  const showSkeleton = useDelayedLoading(isLoading || local.isLoading);
  const shouldReduceMotion = useReducedMotion();
  const isStoryListed = (storyId: string | null | undefined) =>
    typeof storyId === 'string' &&
    !isLoading &&
    !isError &&
    stories.some((story) => story.id === storyId);
  const visibleCompletionRecords = completionRecords.filter(
    (record) => !isStoryListed(record.createdStoryId),
  );
  const completedRequestIds = completionRecords
    .filter((record) => isStoryListed(record.createdStoryId))
    .map((record) => record.requestId)
    .join(',');

  useEffect(() => {
    for (const requestId of completedRequestIds.split(',')) {
      if (requestId) takeStoryCompletionRequest(requestId);
    }
  }, [completedRequestIds]);

  const rowMotion = {
    initial: shouldReduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' },
  } as const;

  // 새 제작은 기존 초안을 묻지 않고 항상 새 세션으로 시작한다. 초안 재개는 진행 카드가 맡는다.
  const handleCreateClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    // 앱과 같이 빈 목록에도 FAB 하나만 두므로 출처는 늘 fab이다.
    track('client_storyList_createButton_clicked', { source: 'fab' });
    router.push(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  // 진행 카드(초안·완성 중)가 하나라도 있으면 목록이 비어 있어도 빈 안내를 두지 않는다.
  const showsEmptyNotice =
    isEmpty &&
    pendingCreationRecords.length === 0 &&
    visibleCompletionRecords.length === 0;

  let stateKey: string;
  let content: ReactNode;

  if (showSkeleton && visibleCompletionRecords.length === 0) {
    stateKey = 'skeleton';
    content = <CreatedStoryListSkeleton />;
  } else if (
    (isLoading || local.isLoading) &&
    visibleCompletionRecords.length === 0
  ) {
    stateKey = 'pending';
    content = null;
  } else if (isError || local.isError) {
    stateKey = 'error';
    content = (
      <RetryListStatus
        title={STORY_LIST_ERROR_TITLE}
        onRetry={() => {
          local.retry();
          void refetch();
        }}
      />
    );
  } else {
    // 앱과 같이 빈 목록에도 FAB만 둔다. 만들기 진입은 FAB이 맡는다.
    stateKey = 'list';
    content = showsEmptyNotice ? (
      <EmptyListNotice>{CREATED_STORY_LIST_COPY.emptyTitle}</EmptyListNotice>
    ) : null;
  }

  return (
    <>
      <ul className="relative flex shrink-0 flex-col">
        <AnimatePresence mode="popLayout" initial={false}>
          {pendingCreationRecords.map((record) => (
            <m.li
              key={`creation-${record.requestId}`}
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <CreationProgressCard record={record} />
            </m.li>
          ))}
          {visibleCompletionRecords.map((record) => (
            <m.li
              key={`creation-${record.requestId}`}
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <CreationProgressCard record={record} />
            </m.li>
          ))}
          {!isLoading && !isError && !local.isLoading
            ? stories.map((story, index) => (
                <m.li
                  key={story.id}
                  layout={shouldReduceMotion ? false : 'position'}
                  {...rowMotion}>
                  <CreatedStoryCard story={story} position={index} />
                </m.li>
              ))
            : null}
        </AnimatePresence>
      </ul>
      <section className="flex min-h-0 flex-1 flex-col">
        <FadeStateSwitch
          stateKey={stateKey}
          className="flex min-h-0 flex-1 flex-col">
          {content}
        </FadeStateSwitch>
      </section>
      {/* 스크롤 콘텐츠 밖으로 포털되므로 위치는 무관하다. 목록 상태에서만 둔다. */}
      {stateKey === 'list' ? (
        <CreateStoryFab onCreate={handleCreateClick} />
      ) : null}
    </>
  );
}
