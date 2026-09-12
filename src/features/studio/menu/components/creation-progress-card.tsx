'use client';

import { Delete02Icon } from '@hugeicons/core-free-icons';
import { useRouter } from 'next/navigation';

import { ImageGeneration } from '@/components/agents/image-generation';
import { CardOptionsDialog } from '@/components/common/card-options-dialog';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import type { PendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { takePendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { markDraftResumeIntent } from '@/features/stories/_shared/utils/draft-resume-intent';
import { cn } from '@/lib/utils';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import { CREATION_PROGRESS_CARD_COPY } from '../constants';
import { useCreationProgressPolling } from '../hooks/use-creation-progress-polling';

type CreationProgressCardProps = {
  record: PendingCreationRequest;
};

export function CreationProgressCard({ record }: CreationProgressCardProps) {
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

  return (
    <article
      ref={impressionRef}
      aria-label={
        record.stage === 'STORY_COMPLETION'
          ? CREATION_PROGRESS_CARD_COPY.completingTitle
          : CREATION_PROGRESS_CARD_COPY.draftTitle
      }
      className="flex px-4 py-2">
      {record.stage === 'STORY_COMPLETION' ? (
        <CompletingCardBody record={record} />
      ) : record.stage === 'STORYLINE_GENERATION' ? (
        <GeneratingCardBody record={record} />
      ) : (
        <DraftCardBody record={record} />
      )}
    </article>
  );
}

type CompletingCardBodyProps = {
  record: Extract<PendingCreationRequest, { stage: 'STORY_COMPLETION' }>;
};

function CompletingCardBody({ record }: CompletingCardBodyProps) {
  useCreationProgressPolling(record);

  return <CreationProgressCardBody isCompleting />;
}

type GeneratingCardBodyProps = {
  record: Extract<PendingCreationRequest, { stage: 'STORYLINE_GENERATION' }>;
};

function GeneratingCardBody({ record }: GeneratingCardBodyProps) {
  useCreationProgressPolling(record);

  return <DraftCardBody record={record} />;
}

type DraftCardBodyProps = {
  record: Exclude<PendingCreationRequest, { stage: 'STORY_COMPLETION' }>;
};

function DraftCardBody({ record }: DraftCardBodyProps) {
  const router = useRouter();

  const handleResume = () => {
    track('client_storyCreate_continueBanner_clicked', { stage: record.stage });

    if (record.stage === 'KEYWORD_DRAFT' || record.stage === 'STORY_DRAFT') {
      markDraftResumeIntent(record.requestId);
    }

    router.push(APP_PATH.STUDIO.STORY.SIMPLE);
  };

  return (
    <CreationProgressCardBody
      isCompleting={false}
      action={
        <CardOptionsDialog
          title={CREATION_PROGRESS_CARD_COPY.optionsTitle}
          triggerAriaLabel={CREATION_PROGRESS_CARD_COPY.optionsTrigger}
          items={[
            {
              icon: Delete02Icon,
              label: CREATION_PROGRESS_CARD_COPY.delete,
              variant: 'destructive',
              onSelect: () => {
                takePendingCreationRequest(record.requestId);
              },
              confirm: {
                title: CREATION_PROGRESS_CARD_COPY.deleteConfirmTitle,
                description:
                  CREATION_PROGRESS_CARD_COPY.deleteConfirmDescription,
              },
            },
          ]}
          preview={<CreationProgressCardBody isCompleting={false} compact />}
        />
      }>
      <Button className="w-full" onClick={handleResume}>
        {CREATION_PROGRESS_CARD_COPY.resume}
      </Button>
    </CreationProgressCardBody>
  );
}

type CreationProgressCardBodyProps = {
  isCompleting: boolean;
  compact?: boolean;
  /** 제목 줄 오른쪽 끝에 놓는 요소(옵션 버튼) */
  action?: React.ReactNode;
  /** 본문 하단에 놓는 요소(주 동작 버튼) */
  children?: React.ReactNode;
};

function CreationProgressCardBody({
  isCompleting,
  compact = false,
  action,
  children,
}: CreationProgressCardBodyProps) {
  const title = isCompleting
    ? CREATION_PROGRESS_CARD_COPY.completingTitle
    : CREATION_PROGRESS_CARD_COPY.draftTitle;
  const description = isCompleting
    ? CREATION_PROGRESS_CARD_COPY.completingDescription
    : CREATION_PROGRESS_CARD_COPY.draftDescription;

  return (
    <div className={cn('flex min-w-0 flex-1', compact ? 'gap-3' : 'gap-4')}>
      <AspectRatio
        ratio={3 / 4}
        className={cn(
          'shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
          compact ? 'w-20' : 'w-32',
        )}>
        {isCompleting ? (
          <ImageGeneration
            status="generating"
            label={CREATION_PROGRESS_CARD_COPY.completingState}
            aspectRatio="3 / 4"
            size="fluid"
            interactive={false}
            showStatus={false}
            resolution=""
          />
        ) : (
          <div className="flex size-full items-center justify-center text-foreground-tertiary">
            <ManyakSymbolIcon
              aria-hidden="true"
              className={compact ? 'size-6' : 'size-8'}
            />
          </div>
        )}
      </AspectRatio>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col justify-between py-0.5',
          compact ? 'min-h-[6.6667rem]' : 'min-h-[10.6667rem]',
        )}>
        <div>
          <div className="flex items-start gap-2">
            <p
              className={cn(
                'line-clamp-2 min-w-0 flex-1 font-semibold break-keep text-foreground-secondary',
                compact ? 'text-sm leading-5' : 'leading-6',
              )}>
              {title}
            </p>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          {compact ? null : (
            <p className="mt-1 text-sm leading-5 break-keep text-foreground-secondary">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
