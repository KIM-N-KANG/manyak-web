'use client';

import { useSyncExternalStore } from 'react';

import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import {
  clearPendingCreationRequest,
  getPendingCreationRequestSnapshot,
  getServerPendingCreationRequestSnapshot,
  parsePendingCreationRequest,
  subscribePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { markDraftResumeIntent } from '@/features/stories/_shared/utils/draft-resume-intent';
import { SCREEN, track, useImpression } from '@/observability/analytics';

export function ContinueCreationBanner() {
  const router = useRouter();
  const rawRecord = useSyncExternalStore(
    subscribePendingCreationRequest,
    getPendingCreationRequestSnapshot,
    getServerPendingCreationRequestSnapshot,
  );
  const record = parsePendingCreationRequest(rawRecord);

  const impressionRef = useImpression({
    object: 'continueBanner',
    itemId: record?.requestId ?? '',
    screen: SCREEN.STORY_LIST,
    onImpress: () => {
      if (record) {
        track('client_storyCreate_continueBanner_shown', {
          stage: record.stage,
        });
      }
    },
  });

  if (!record) {
    return null;
  }

  const isDraftStage = record.stage === 'STORY_DRAFT';
  const isCompletionStage = record.stage === 'STORY_COMPLETION';

  const bannerMessage = isDraftStage
    ? '만들다 만 스토리가 있어요'
    : isCompletionStage
      ? '완성 중인 스토리가 있어요'
      : '만들고 있는 스토리가 있어요';

  const handleContinue = () => {
    track('client_storyCreate_continueBanner_clicked', { stage: record.stage });

    if (isDraftStage) {
      markDraftResumeIntent(record.requestId);
    }

    router.push(APP_PATH.CREATOR.STORY);
  };

  const handleDismiss = () => {
    track('client_storyCreate_continueBanner_dismissed', {
      stage: record.stage,
    });
    clearPendingCreationRequest();
  };

  return (
    <section
      ref={impressionRef}
      aria-label="이어서 만들기"
      className="m-4 flex items-center gap-2 rounded-lg bg-muted p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{bannerMessage}</p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={handleContinue}>
          이어서 만들기
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="이어서 만들기 배너 닫기"
          onClick={handleDismiss}>
          <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
