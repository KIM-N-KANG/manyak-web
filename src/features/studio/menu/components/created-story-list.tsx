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
  // 기기 안 초안과 서버 초안(회원 간편 제작과 일반 제작)을 한 묶음으로 최신순에 놓는다.
  const draftItems = mergeDraftCards(
    local.pending ?? [],
    serverDrafts.cards,
    local.completions,
  );
  const completionRecords = local.completions ?? [];
  const isDraftsLoading = local.isLoading || serverDrafts.isLoading;
  // 초안, 검수 제출본, 내 스토리가 모두 준비될 때까지 한 스켈레톤으로 덮어 한 목록처럼 함께 보인다.
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
  // 간편 제작 첫 진입 안내의 마지막 단계는 완성 중 카드가 보일 때 연다.
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

    // 회원은 만들고 있는 스토리 카드가 가득 차면 새로 만들지 않는다. 조회 중이면 퍼널 진입이 다시 센다.
    if (isMember && !isDraftsLoading && draftItems.length >= DRAFT_CARD_LIMIT) {
      toast.error(TOAST_MESSAGE.STORY_DRAFT_CARD_LIMIT_REACHED);

      return;
    }

    router.push(APP_PATH.STUDIO.STORY.SELECT);
  };

  // 진행 카드(초안·완성 중·검수 제출본)가 하나라도 있으면 목록이 비어 있어도 빈 안내를 두지 않는다.
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
    // 앱과 같이 빈 목록에도 FAB만 둔다. 만들기 진입은 FAB이 맡는다.
    stateKey = 'list';
    content = showsEmptyNotice ? (
      <EmptyListNotice>{CREATED_STORY_LIST_COPY.emptyTitle}</EmptyListNotice>
    ) : null;
  }

  return (
    <>
      <ul className="relative flex shrink-0 flex-col not-empty:pb-2">
        <AnimatePresence mode="popLayout" initial={false}>
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
          {(isListLoading ? [] : submissions).map((submission) =>
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
          {visibleCompletionRecords.map((record) => (
            <m.li
              key={`creation-${record.requestId}`}
              layout={shouldReduceMotion ? false : 'position'}
              {...rowMotion}>
              <CreationProgressCard record={record} />
            </m.li>
          ))}
          {!isListLoading && !isError
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
      {tutorial.stage !== null && (
        <CreateTutorialDialog
          stage={tutorial.stage}
          onPrimary={() => {
            // 하단 탭과 같이 홈 탭으로 바꾼다. 대화창의 뒤로가기 기록을 먼저 소비한다.
            leaveLayers(() => router.replace(APP_PATH.MAIN.STORIES));
            tutorial.handlePrimary();
          }}
          onSecondary={tutorial.handleSecondary}
        />
      )}
    </>
  );
}
