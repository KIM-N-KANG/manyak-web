'use client';

import { type MouseEvent, type ReactNode, useEffect } from 'react';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { FadeStateSwitch } from '@/components/common/fade-state-switch';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { CreateTutorialDialog } from '@/features/stories/_shared/components/create-tutorial-dialog';
import { STORY_LIST_ERROR_TITLE } from '@/features/stories/_shared/constants/story-list';
import { useCreateTutorial } from '@/features/stories/_shared/hooks/use-create-tutorial';
import { takeStoryCompletionRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { DRAFT_CARD_LIMIT } from '@/features/stories/_shared/utils/draft-card-limit';
import { mergeDraftCards } from '@/features/stories/_shared/utils/merge-draft-cards';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { leaveLayers } from '@/lib/history-layers';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

import { CREATED_STORY_LIST_COPY } from '../constants';
import { useCreatedStories } from '../hooks/use-created-stories';
import { useCreationRecords } from '../hooks/use-pending-creation-request';
import { useStoryDrafts } from '../hooks/use-story-drafts';
import { useStorySubmissions } from '../hooks/use-story-submissions';
import { CreateStoryFab } from './create-story-fab';
import { CreatedStoryCard } from './created-story-card';
import { CreatedStoryListSkeleton } from './created-story-list-skeleton';
import {
  CreationProgressCard,
  ServerDraftCard,
} from './creation-progress-card';
import { SubmissionCard } from './submission-card';

export function CreatedStoryList() {
  const router = useRouter();
  const { isMember } = useMemberAccess();
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();
  const local = useCreationRecords();
  const submissionList = useStorySubmissions();
  const { submissions } = submissionList;
  const serverDrafts = useStoryDrafts(local.pending);
  const draftItems = mergeDraftCards(
    local.pending ?? [],
    serverDrafts.cards,
    local.completions,
  );
  const completionRecords = local.completions ?? [];
  const isDraftsLoading = local.isLoading || serverDrafts.isLoading;
  const isListLoading =
    isLoading || isDraftsLoading || submissionList.isLoading;
  const showSkeleton = useDelayedLoading(isListLoading);
  const shouldReduceMotion = useReducedMotion();
  const isStoryListed = (storyId: string | null | undefined) =>
    typeof storyId === 'string' &&
    !isLoading &&
    !isError &&
    stories.some((story) => story.id === storyId);
  const visibleCompletionRecords = completionRecords.filter(
    (record) => !isStoryListed(record.createdStoryId),
  );
  const tutorial = useCreateTutorial(
    visibleCompletionRecords.length > 0 ? 'completing' : null,
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

  const progressSubmissions = isListLoading
    ? []
    : submissions.filter((submission) => submission.status !== 'APPROVED');
  const progressCount =
    (isListLoading ? 0 : draftItems.length) + progressSubmissions.length;
  const listedStories = !isListLoading && !isError ? stories : [];
  const storySectionCount =
    visibleCompletionRecords.length + listedStories.length;

  const rowMotion = {
    initial: shouldReduceMotion ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' },
  } as const;

  const handleCreateClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    track('client_storyList_createButton_clicked', { source: 'fab' });

    if (isMember && !isDraftsLoading && draftItems.length >= DRAFT_CARD_LIMIT) {
      toast.error(TOAST_MESSAGE.STORY_DRAFT_CARD_LIMIT_REACHED);

      return;
    }

    router.push(APP_PATH.STUDIO.STORY.SELECT);
  };

  const showsEmptyNotice =
    isEmpty &&
    draftItems.length === 0 &&
    visibleCompletionRecords.length === 0 &&
    submissions.length === 0;

  let stateKey: string;
  let content: ReactNode;

  if (showSkeleton && visibleCompletionRecords.length === 0) {
    stateKey = 'skeleton';
    content = <CreatedStoryListSkeleton />;
  } else if (isListLoading && visibleCompletionRecords.length === 0) {
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
    stateKey = 'list';
    content = showsEmptyNotice ? (
      <EmptyListNotice>{CREATED_STORY_LIST_COPY.emptyTitle}</EmptyListNotice>
    ) : null;
  }

  return (
    <>
      <ul className="relative flex shrink-0 flex-col not-empty:pb-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {progressCount > 0 ? (
            <m.li
              key="section-progress"
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <StudioSectionTitle
                title={CREATED_STORY_LIST_COPY.progressSection}
                count={progressCount}
              />
            </m.li>
          ) : null}
          {(isListLoading ? [] : draftItems).map((item) => (
            <m.li
              key={`creation-${item.source === 'server' ? item.card.draftId : item.record.requestId}`}
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              {item.source === 'server' ? (
                <ServerDraftCard card={item.card} />
              ) : (
                <CreationProgressCard
                  record={item.record}
                  hiddenServerDraftId={item.hiddenServerDraftId}
                />
              )}
            </m.li>
          ))}
          {progressSubmissions.map((submission) =>
            submission.status === 'APPROVED' ? null : (
              <m.li
                key={`submission-${submission.submissionId}`}
                layout={shouldReduceMotion ? false : 'position'}
                {...rowMotion}>
                <SubmissionCard
                  submission={{ ...submission, status: submission.status }}
                />
              </m.li>
            ),
          )}
          {storySectionCount > 0 ? (
            <m.li
              key="section-stories"
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <StudioSectionTitle
                title={CREATED_STORY_LIST_COPY.storySection}
                count={storySectionCount}
                isFollowing={progressCount > 0}
              />
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
          {listedStories.map((story, index) => (
            <m.li
              key={story.id}
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <CreatedStoryCard story={story} position={index} />
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <section className="flex min-h-0 flex-1 flex-col">
        <FadeStateSwitch
          stateKey={stateKey}
          className="flex min-h-0 flex-1 flex-col">
          {content}
        </FadeStateSwitch>
      </section>
      {stateKey === 'list' ? (
        <CreateStoryFab onCreate={handleCreateClick} />
      ) : null}
      {tutorial.stage !== null && (
        <CreateTutorialDialog
          stage={tutorial.stage}
          onPrimary={() => {
            leaveLayers(() => router.replace(APP_PATH.MAIN.STORIES));
            tutorial.handlePrimary();
          }}
          onSecondary={tutorial.handleSecondary}
        />
      )}
    </>
  );
}

type StudioSectionTitleProps = {
  title: string;
  count: number;
  /** 앞 구역 바로 뒤에 오면 위 여백을 넓혀 구역을 가른다. */
  isFollowing?: boolean;
};

function StudioSectionTitle({
  title,
  count,
  isFollowing = false,
}: StudioSectionTitleProps) {
  return (
    <h2
      className={cn(
        'flex items-center gap-1.5 px-4 pb-1 text-lg leading-7 font-semibold',
        isFollowing ? 'pt-6' : 'pt-2',
      )}>
      {title}
      <span className="text-sm font-medium text-foreground-secondary">
        {count}
      </span>
    </h2>
  );
}
