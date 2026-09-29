'use client';

import { Delete02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  getListQueryKey as getStorySubmissionsQueryKey,
  useDelete as useDeleteStorySubmission,
} from '@/api/generated/endpoints/story-submission-controller/story-submission-controller';
import { CardOptionsSheet } from '@/components/common/card-options-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import type { StorySubmission } from '@/features/studio/_shared/utils/story-submission';
import { track } from '@/observability/analytics';

import { SUBMISSION_CARD_COPY } from '../constants';
import { CreationProgressCardBody, SavedAtRow } from './creation-progress-card';

type SubmissionCardProps = {
  submission: StorySubmission & { status: 'PENDING' | 'REJECTED' | 'FAILED' };
};

/**
 * 카드 설명 문구를 고른다. 반려는 고칠 곳 수를, 실패는 이미지 문제인지를 알린다.
 *
 * @param submission 제출본
 * @returns 설명 문구
 */
function getDescription({
  status,
  issues,
  imageErrors,
  errorCode,
}: SubmissionCardProps['submission']): string {
  const { description } = SUBMISSION_CARD_COPY;
  const count = issues.length + imageErrors.length;

  if (status === 'PENDING') return description.PENDING;

  if (status === 'REJECTED')
    return count > 0
      ? description.rejectedWithCount(count)
      : description.REJECTED;

  return imageErrors.length > 0 || errorCode?.startsWith('IMAGE_')
    ? description.failedImage
    : description.FAILED;
}

export function SubmissionCard({ submission }: SubmissionCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteSubmission = useDeleteStorySubmission();
  const { submissionId, status, payload, createdAt } = submission;
  const isPending = status === 'PENDING';
  const title = payload.title.trim() || SUBMISSION_CARD_COPY.fallbackTitle;
  const trackClick = (action: 'edit' | 'cancel' | 'delete') =>
    track('client_storyList_submissionCard_clicked', {
      submission_id: submissionId,
      status:
        status === 'PENDING'
          ? 'pending'
          : status === 'REJECTED'
            ? 'rejected'
            : 'failed',
      action,
    });

  const handleRemove = async () => {
    trackClick(isPending ? 'cancel' : 'delete');

    try {
      await deleteSubmission.mutateAsync({ id: submissionId });

      if (isPending) toast(TOAST_MESSAGE.STORY_REGISTER_CANCELED);
    } catch {
      toast.error(
        isPending
          ? TOAST_MESSAGE.STORY_REGISTER_CANCEL_FAILED
          : TOAST_MESSAGE.STORY_DELETE_FAILED,
      );
    } finally {
      void queryClient.invalidateQueries({
        queryKey: getStorySubmissionsQueryKey(),
      });
    }
  };

  return (
    <article aria-label={title} className="flex px-4 py-2">
      <CreationProgressCardBody
        isCompleting={false}
        title={title}
        cover={payload.cover?.imageUrl ?? undefined}
        description={getDescription(submission)}
        badge={
          <Badge
            variant={isPending ? 'secondary' : 'destructive'}
            className="mb-1">
            {SUBMISSION_CARD_COPY.badge[status]}
          </Badge>
        }
        action={
          <CardOptionsSheet
            kind={SUBMISSION_CARD_COPY.optionsKind}
            title={title}
            triggerAriaLabel={SUBMISSION_CARD_COPY.optionsTrigger}
            items={[
              {
                icon: Delete02Icon,
                label: isPending
                  ? SUBMISSION_CARD_COPY.cancel
                  : SUBMISSION_CARD_COPY.delete,
                variant: 'destructive',
                onSelect: handleRemove,
                confirm: {
                  title: isPending
                    ? SUBMISSION_CARD_COPY.cancelConfirmTitle
                    : SUBMISSION_CARD_COPY.deleteConfirmTitle,
                  description: isPending
                    ? SUBMISSION_CARD_COPY.cancelConfirmDescription
                    : SUBMISSION_CARD_COPY.deleteConfirmDescription,
                  isPending: deleteSubmission.isPending,
                },
              },
            ]}
          />
        }>
        <div className="flex flex-col gap-2">
          {createdAt ? (
            <SavedAtRow
              createdAt={createdAt}
              label={SUBMISSION_CARD_COPY.submittedAtLabel}
            />
          ) : null}
          {!isPending && (
            <Button
              className="w-full"
              onClick={() => {
                trackClick('edit');
                router.push(
                  APP_PATH.STUDIO.STORY.GENERAL_SUBMISSION(submissionId),
                );
              }}>
              {SUBMISSION_CARD_COPY.edit}
            </Button>
          )}
        </div>
      </CreationProgressCardBody>
    </article>
  );
}
