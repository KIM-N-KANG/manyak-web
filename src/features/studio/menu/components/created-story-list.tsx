'use client';

import { type MouseEvent, type ReactNode, useState } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { ListStatus } from '@/components/common/list-status';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryCreateResumeDialog } from '@/features/stories/_shared/components/story-create-resume-dialog';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import type { DraftCreationRecord } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  loadPendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { markDraftResumeIntent } from '@/features/stories/_shared/utils/draft-resume-intent';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { track } from '@/observability/analytics';

import { useCreatedStories } from '../hooks/use-created-stories';
import { usePendingCreationRequest } from '../hooks/use-pending-creation-request';
import { ContinueCreationBanner } from './continue-creation-banner';
import { CreateStoryFab } from './create-story-fab';
import { CreatedStoryCard } from './created-story-card';
import { CreatedStoryListSkeleton } from './created-story-list-skeleton';

export function CreatedStoryList() {
  const router = useRouter();
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const pendingCreationRecord = usePendingCreationRequest();
  const showSkeleton = useDelayedLoading(isLoading);
  const shouldReduceMotion = useReducedMotion();
  const [resumeDialogRecord, setResumeDialogRecord] =
    useState<DraftCreationRecord | null>(null);

  const handleCreateClick = (
    event: MouseEvent<HTMLAnchorElement>,
    source: 'fab' | 'emptyState',
  ) => {
    track('client_storyList_createButton_clicked', { source });

    if (
      pendingCreationRecord?.stage !== 'KEYWORD_DRAFT' &&
      pendingCreationRecord?.stage !== 'STORY_DRAFT'
    ) {
      return;
    }

    event.preventDefault();
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
        title={STORY_LIST_ERROR_TITLE}
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
              href={APP_PATH.STUDIO.STORY.SIMPLE}
              onClick={(event) => handleCreateClick(event, 'emptyState')}
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
            <li key={story.id}>
              <CreatedStoryCard story={story} position={index} />
            </li>
          ))}
        </ul>
        <CreateStoryFab onCreate={(event) => handleCreateClick(event, 'fab')} />
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {pendingCreationRecord ? (
          <m.div
            key={pendingCreationRecord.requestId}
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.2,
              ease: 'easeOut',
            }}>
            <ContinueCreationBanner record={pendingCreationRecord} />
          </m.div>
        ) : null}
      </AnimatePresence>
      <section className="flex min-h-0 flex-1 flex-col pb-4">
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
