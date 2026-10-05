'use client';

import { useEffect, useRef } from 'react';

import { Calendar04Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { CardOptionsSheet } from '@/components/common/card-options-sheet';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { TextShimmer } from '@/components/motion/text-shimmer';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import type {
  CreationProgressRecord,
  PendingCreationRequest,
  StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { takePendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { markDraftResumeIntent } from '@/features/stories/_shared/utils/draft-resume-intent';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { SCREEN, track, useImpression } from '@/observability/analytics';

import { CREATION_PROGRESS_CARD_COPY } from '../constants';
import { useCreationProgressPolling } from '../hooks/use-creation-progress-polling';
import { StoryCompletingStage } from './story-completing-stage';

type CreationProgressCardProps = {
  record: CreationProgressRecord;
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

/** 내 스토리 카드의 날짜 줄과 같은 자리·스타일로 처음 임시 저장한(또는 등록을 요청한) 시각을 보여 준다. */
export function SavedAtRow({
  createdAt,
  label = CREATION_PROGRESS_CARD_COPY.savedAtLabel,
}: {
  createdAt: string;
  /** 스크린 리더가 읽는 시각의 뜻이다. */
  label?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1 text-sm whitespace-nowrap text-foreground-secondary">
      <HugeiconsIcon
        icon={Calendar04Icon}
        className="size-3.5"
        aria-hidden="true"
      />
      <time dateTime={createdAt}>
        <span className="sr-only">{label} </span>
        {formatDateTime(createdAt)}
      </time>
    </div>
  );
}

type CompletingCardBodyProps = {
  record: StoryCompletionRecord;
};

function CompletingCardBody({ record }: CompletingCardBodyProps) {
  useCreationProgressPolling(record);

  return (
    <CreationProgressCardBody isCompleting>
      {record.createdAt ? <SavedAtRow createdAt={record.createdAt} /> : null}
    </CreationProgressCardBody>
  );
}

type GeneratingCardBodyProps = {
  record: Extract<PendingCreationRequest, { stage: 'STORYLINE_GENERATION' }>;
};

function GeneratingCardBody({ record }: GeneratingCardBodyProps) {
  useCreationProgressPolling(record);

  return <DraftCardBody record={record} />;
}

type DraftCardBodyProps = {
  record: PendingCreationRequest;
};

/**
 * 초안 레코드가 멈춘 단계의 설명 문구를 고른다. 일반 제작 초안은 입력한 한 줄 소개를 쓴다.
 *
 * @param record 초안·생성 중 레코드
 * @returns 단계별 설명
 */
function getDraftDescription(record: PendingCreationRequest): string {
  const { draftDescription } = CREATION_PROGRESS_CARD_COPY;

  if (record.stage === 'GENERAL_DRAFT')
    return (
      record.snapshot.texts.oneLineIntro.trim() || draftDescription.general
    );

  if (record.stage === 'KEYWORD_DRAFT') return draftDescription.keyword;

  if (record.stage === 'STORYLINE_GENERATION')
    return draftDescription.generating;

  return draftDescription[record.step];
}

function DraftCardBody({ record }: DraftCardBodyProps) {
  const router = useRouter();
  const epoch = useCreationEpoch();
  const isGeneral = record.stage === 'GENERAL_DRAFT';
  const title =
    (isGeneral && record.snapshot.texts.title.trim()) ||
    CREATION_PROGRESS_CARD_COPY.draftTitle;

  const handleResume = () => {
    track('client_storyCreate_continueBanner_clicked', { stage: record.stage });
    markDraftResumeIntent(record.requestId);
    router.push(
      isGeneral ? APP_PATH.STUDIO.STORY.GENERAL : APP_PATH.STUDIO.STORY.SIMPLE,
    );
  };

  return (
    <CreationProgressCardBody
      isCompleting={false}
      title={title}
      cover={(isGeneral && record.snapshot.cover?.blob) || undefined}
      description={getDraftDescription(record)}
      action={
        <CardOptionsSheet
          kind={CREATION_PROGRESS_CARD_COPY.optionsKind}
          title={title}
          triggerAriaLabel={CREATION_PROGRESS_CARD_COPY.optionsTrigger}
          items={[
            {
              icon: Delete02Icon,
              label: CREATION_PROGRESS_CARD_COPY.delete,
              variant: 'destructive',
              onSelect: async () => {
                if (
                  !(await takePendingCreationRequest(record.requestId, epoch))
                )
                  toast.error(TOAST_MESSAGE.STORY_DELETE_FAILED);
              },
              confirm: {
                title: CREATION_PROGRESS_CARD_COPY.deleteConfirmTitle,
                description:
                  CREATION_PROGRESS_CARD_COPY.deleteConfirmDescription,
              },
            },
          ]}
        />
      }>
      <div className="flex flex-col gap-2">
        {record.createdAt ? <SavedAtRow createdAt={record.createdAt} /> : null}
        <Button variant="secondary" className="w-full" onClick={handleResume}>
          {CREATION_PROGRESS_CARD_COPY.resume}
        </Button>
      </div>
    </CreationProgressCardBody>
  );
}

function DraftCoverImage({ blob }: { blob: Blob }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);

    if (imageRef.current) imageRef.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [blob]);

  // eslint-disable-next-line @next/next/no-img-element -- blob URL을 effect에서 붙이므로 next/image를 쓸 수 없다.
  return <img ref={imageRef} alt="" className="size-full object-cover" />;
}

type CreationProgressCardBodyProps = {
  isCompleting: boolean;
  /** 초안 카드 제목. 없으면 단계에 맞는 고정 문구를 쓴다. */
  title?: string;
  /** 일반 제작 초안의 표지 파일 또는 검수 제출본의 표지 URL. 없으면 기본 심벌을 보인다. */
  cover?: Blob | string;
  /** 제목 위에 두는 상태 표시(검수 제출본의 상태 배지) */
  badge?: React.ReactNode;
  /** 초안 카드의 단계별 설명. 완성 중 카드는 고정 문구를 쓴다. */
  description?: string;
  /** 제목 줄 오른쪽 끝에 놓는 요소(옵션 버튼) */
  action?: React.ReactNode;
  /** 본문 하단에 놓는 요소(주 동작 버튼) */
  children?: React.ReactNode;
};

export function CreationProgressCardBody({
  isCompleting,
  title = isCompleting
    ? CREATION_PROGRESS_CARD_COPY.completingTitle
    : CREATION_PROGRESS_CARD_COPY.draftTitle,
  cover,
  description = CREATION_PROGRESS_CARD_COPY.completingDescription,
  badge,
  action,
  children,
}: CreationProgressCardBodyProps) {
  return (
    <div className={cn('flex min-w-0 flex-1', 'gap-4')}>
      <AspectRatio
        ratio={3 / 4}
        className={cn(
          'shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
          'w-32',
        )}>
        {isCompleting ? (
          <StoryCompletingStage
            label={CREATION_PROGRESS_CARD_COPY.completingState}
          />
        ) : typeof cover === 'string' ? (
          <Image src={cover} alt="" fill unoptimized className="object-cover" />
        ) : cover ? (
          <DraftCoverImage blob={cover} />
        ) : (
          <div className="flex size-full items-center justify-center text-foreground-tertiary">
            <ManyakSymbolIcon aria-hidden="true" className={'size-8'} />
          </div>
        )}
      </AspectRatio>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col justify-between py-0.5',
          'min-h-[10.6667rem]',
        )}>
        <div>
          {badge}
          <div className="flex items-start gap-2">
            <p
              className={cn(
                'line-clamp-2 min-w-0 flex-1 font-semibold wrap-break-word break-keep text-foreground-secondary',
                'leading-6',
              )}>
              {isCompleting ? (
                <TextShimmer duration={4}>{title}</TextShimmer>
              ) : (
                title
              )}
            </p>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-5 wrap-break-word break-keep text-foreground-secondary">
            {description}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
