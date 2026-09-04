'use client';

import { type SubmitEvent, useEffect, useState } from 'react';

import { toast } from 'sonner';

import { useReportStory } from '@/api/generated/endpoints/stories/stories';
import type { StoryReportRequestReason } from '@/api/generated/models';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  STORY_REPORT_COPY,
  STORY_REPORT_DETAIL_MAX_LENGTH,
  STORY_REPORT_REASONS,
} from '@/features/stories/_shared/constants/story-report';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { FetchError } from '@/lib/custom-fetch';
import { cn } from '@/lib/utils';
import { type ReportSource, track } from '@/observability/analytics';

/**
 * 스토리 신고 바텀시트의 props. 상세·채팅방·카드 다이얼로그가 시트 하나를 함께 쓴다 —
 * 채팅에서 열어도 신고 대상은 그 채팅이 참조하는 스토리다(서버 계약이 스토리 단위).
 * 전송 실패 시 시트와 입력을 그대로 두며, 입력 상태는 시트 내용에 두어 닫히면 함께 버려진다.
 */
type StoryReportSheetProps = {
  /** 신고 대상 스토리 ID. 채팅에서 열면 참조 스토리의 ID다 */
  storyId: string;
  /** 시트를 연 화면(분석 프로퍼티) */
  source: ReportSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StoryReportSheet({
  storyId,
  source,
  open,
  onOpenChange,
}: StoryReportSheetProps) {
  const container = useAppFrameContainer();
  const { mutateAsync, isPending } = useReportStory();

  useEffect(() => {
    if (open) {
      track('client_report_sheet_opened', {
        target_type: 'story',
        target_id: storyId,
        source,
      });
    }
  }, [open, source, storyId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const submit = async (reason: StoryReportRequestReason, detail: string) => {
    track('client_report_submitted', {
      target_type: 'story',
      target_id: storyId,
      reason,
      has_detail: detail.length > 0,
    });

    try {
      await mutateAsync({
        storyId,
        data: { reason, detail: detail || null },
      });
      toast.success(TOAST_MESSAGE.STORY_REPORTED);
      onOpenChange(false);
    } catch (error) {
      track('client_report_failed', {
        target_type: 'story',
        error_type:
          error instanceof FetchError ? `http_${error.status}` : 'network',
      });
      toast.error(TOAST_MESSAGE.STORY_REPORT_FAILED);
    }
  };

  return (
    <Drawer
      open={open && container !== null}
      dismissible={!isPending}
      onOpenChange={handleOpenChange}>
      <DrawerContent
        container={container}
        className="absolute overflow-y-auto overscroll-contain"
        overlayClassName="absolute">
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {STORY_REPORT_COPY.title}
          </DrawerTitle>
          <DrawerDescription className="text-base leading-6">
            {STORY_REPORT_COPY.description}
          </DrawerDescription>
        </DrawerHeader>
        <StoryReportForm
          isSubmitting={isPending}
          onSubmit={submit}
          onClose={() => handleOpenChange(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

type StoryReportFormProps = {
  isSubmitting: boolean;
  onSubmit: (reason: StoryReportRequestReason, detail: string) => void;
  onClose: () => void;
};

function StoryReportForm({
  isSubmitting,
  onSubmit,
  onClose,
}: StoryReportFormProps) {
  const [reason, setReason] = useState<StoryReportRequestReason | null>(null);
  const [detail, setDetail] = useState('');

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (reason) {
      onSubmit(reason, detail.trim());
    }
  };

  return (
    <form
      className="flex w-full flex-col px-4 pt-8 pb-4"
      onSubmit={handleSubmit}>
      <fieldset disabled={isSubmitting} className="flex flex-col">
        <legend className="sr-only">신고 사유</legend>
        {STORY_REPORT_REASONS.map((option) => (
          <Label
            key={option.value}
            className={cn(
              'h-10 cursor-pointer gap-2 text-base font-normal',
              isSubmitting && 'cursor-default',
            )}>
            <input
              type="radio"
              name="reason"
              value={option.value}
              checked={reason === option.value}
              onChange={() => setReason(option.value)}
              className="size-5 shrink-0 accent-primary"
            />
            {option.label}
          </Label>
        ))}
      </fieldset>

      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor="story-report-detail">
          {STORY_REPORT_COPY.detailLabel}
        </Label>
        <InputGroup>
          <InputGroupTextarea
            id="story-report-detail"
            maxLength={STORY_REPORT_DETAIL_MAX_LENGTH}
            placeholder={STORY_REPORT_COPY.detailPlaceholder}
            value={detail}
            disabled={isSubmitting}
            onChange={(event) => setDetail(event.target.value)}
          />
          <InputGroupAddon align="block-end" className="px-3.5 pb-2.5">
            <InputGroupText className="text-xs font-normal">
              {detail.length} / {STORY_REPORT_DETAIL_MAX_LENGTH}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <div className="mt-8 flex flex-col">
        <Button
          type="submit"
          size="lg"
          variant="destructive"
          className="relative w-full"
          disabled={reason === null || isSubmitting}>
          <LoadingButtonContent
            isLoading={isSubmitting}
            loadingLabel={STORY_REPORT_COPY.submitting}>
            {STORY_REPORT_COPY.submit}
          </LoadingButtonContent>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-full text-foreground-secondary"
          disabled={isSubmitting}
          onClick={onClose}>
          {STORY_REPORT_COPY.close}
        </Button>
      </div>
    </form>
  );
}
