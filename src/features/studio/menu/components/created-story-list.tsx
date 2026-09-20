'use client';

import { type MouseEvent, type ReactNode, useEffect, useState } from 'react';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { APP_PATH } from '@/constants/app-path';
import { StoryCreateResumeDialog } from '@/features/stories/_shared/components/story-create-resume-dialog';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import type { DraftCreationRecord } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  loadPendingCreationRequest,
  takePendingCreationRequest,
  takeStoryCompletionRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { markDraftResumeIntent } from '@/features/stories/_shared/utils/draft-resume-intent';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/observability/analytics';

import { CREATED_STORY_LIST_COPY } from '../constants';
import { useCreatedStories } from '../hooks/use-created-stories';
import {
  usePendingCreationRequest,
  useStoryCompletionRequests,
} from '../hooks/use-pending-creation-request';
import { CreateStoryFab } from './create-story-fab';
import { CreatedStoryCard } from './created-story-card';
import { CreatedStoryListSkeleton } from './created-story-list-skeleton';
import { CreationProgressCard } from './creation-progress-card';

export function CreatedStoryList() {
  const router = useRouter();
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const pendingCreationRecord = usePendingCreationRequest();
  const completionRecords = useStoryCompletionRequests();
  const showSkeleton = useDelayedLoading(isLoading);
  const shouldReduceMotion = useReducedMotion();
  const [resumeDialogRecord, setResumeDialogRecord] =
    useState<DraftCreationRecord | null>(null);
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

  const handleCreateClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    // 앱과 같이 빈 목록에도 FAB 하나만 두므로 출처는 늘 fab이다.
    track('client_storyList_createButton_clicked', { source: 'fab' });

    if (
      pendingCreationRecord?.stage !== 'KEYWORD_DRAFT' &&
      pendingCreationRecord?.stage !== 'STORY_DRAFT'
    ) {
      router.push(APP_PATH.STUDIO.STORY.SIMPLE);

      return;
    }

    track('client_storyCreate_resumeDialog_shown');
    setResumeDialogRecord(pendingCreationRecord);
  };

  const handleResumeContinue = () => {
    const record = resumeDialogRecord;

    setResumeDialogRecord(null);
    track('client_storyCreate_resumeDialog_continued');

    const current = loadPendingCreationRequest();

    if (
      record !== null &&
      current?.requestId === record.requestId &&
      (current.stage === 'KEYWORD_DRAFT' || current.stage === 'STORY_DRAFT')
    ) {
      markDraftResumeIntent(record.requestId);
    }

    router.push(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  const handleResumeDiscard = () => {
    const record = resumeDialogRecord;

    setResumeDialogRecord(null);
    track('client_storyCreate_resumeDialog_discarded');

    if (record !== null) {
      takePendingCreationRequest(record.requestId);
    }

    router.push(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  // 진행 카드(초안·완성 중)가 하나라도 있으면 목록이 비어 있어도 빈 안내를 두지 않는다.
  const showsEmptyNotice =
    isEmpty &&
    pendingCreationRecord === null &&
    visibleCompletionRecords.length === 0;

  let stateKey: string;
  let content: ReactNode;

  if (showSkeleton && visibleCompletionRecords.length === 0) {
    stateKey = 'skeleton';
    content = <CreatedStoryListSkeleton />;
  } else if (isLoading && visibleCompletionRecords.length === 0) {
    stateKey = 'pending';
    content = null;
  } else if (isError) {
    stateKey = 'error';
    content = (
      <RetryListStatus
        title={STORY_LIST_ERROR_TITLE}
        onRetry={() => refetch()}
      />
    );
  } else {
    // 앱과 같이 빈 목록에도 FAB만 둔다. 만들기 진입은 FAB이 맡는다.
    stateKey = 'list';
    content = (
      <>
        {showsEmptyNotice ? (
          <EmptyListNotice>
            {CREATED_STORY_LIST_COPY.emptyTitle}
          </EmptyListNotice>
        ) : null}
        <CreateStoryFab onCreate={handleCreateClick} />
      </>
    );
  }

  return (
    <>
      <ul className="relative flex shrink-0 flex-col">
        <AnimatePresence mode="popLayout" initial={false}>
          {pendingCreationRecord ? (
            <m.li
              key={`creation-${pendingCreationRecord.requestId}`}
              {...rowMotion}>
              <CreationProgressCard record={pendingCreationRecord} />
            </m.li>
          ) : null}
          {visibleCompletionRecords.map((record) => (
            <m.li
              key={`creation-${record.requestId}`}
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <CreationProgressCard record={record} />
            </m.li>
          ))}
          {!isLoading && !isError
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
      <section className="flex min-h-0 flex-1 flex-col pb-2">
        <FadeStateSwitch
          stateKey={stateKey}
          className="flex min-h-0 flex-1 flex-col">
          {content}
        </FadeStateSwitch>
      </section>
      <StoryCreateResumeDialog
        open={resumeDialogRecord !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResumeDialogRecord(null);
          }
        }}
        onContinue={handleResumeContinue}
        onDiscard={handleResumeDiscard}
        dismissible
      />
    </>
  );
}
