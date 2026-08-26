'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { markDraftResumeIntent } from '@/features/stories/_shared/utils/draft-resume-intent';
import { SCREEN, track, useImpression } from '@/observability/analytics';

type ContinueCreationBannerProps = {
  record: PendingCreationRequest;
};

export function ContinueCreationBanner({
  record,
}: ContinueCreationBannerProps) {
  const router = useRouter();

  const impressionRef = useImpression({
    object: 'continueBanner',
    itemId: record.requestId,
    screen: SCREEN.STORY_LIST,
    onImpress: () => {
      track('client_storyCreate_continueBanner_shown', {
        stage: record.stage,
      });
    },
  });

  const isDraftStage =
    record.stage === 'KEYWORD_DRAFT' || record.stage === 'STORY_DRAFT';

  const bannerMessage =
    record.stage === 'STORY_COMPLETION'
      ? '완성 중인 스토리가 있어요'
      : '만들고 있는 스토리가 있어요';

  const handleContinue = () => {
    track('client_storyCreate_continueBanner_clicked', { stage: record.stage });

    if (isDraftStage) {
      markDraftResumeIntent(record.requestId);
    }

    router.push(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  return (
    <section
      ref={impressionRef}
      aria-label="이어서 만들기"
      className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-muted py-3 pr-0.5 pl-4">
      <div className="min-w-0 flex-1">
        <p className="font-normal">{bannerMessage}</p>
      </div>
      <Button
        variant="ghost"
        className="text-primary hover:text-primary"
        onClick={handleContinue}>
        이어서 만들기
      </Button>
    </section>
  );
}
