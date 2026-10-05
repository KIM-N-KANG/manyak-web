import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  GENERAL_STORY_REVIEW_COPY,
  GENERAL_STORY_TABS,
} from '@/features/studio/general/constants';
import type { GeneralStoryReviewNotice as ReviewNotice } from '@/features/studio/general/utils/review-issues';
import { cn } from '@/lib/utils';

type GeneralStoryReviewNoticeProps = {
  status: 'PENDING' | 'REJECTED' | 'FAILED';
  /** 이미지 문제로 검토를 마치지 못했는지다. 실패 안내 문구를 고른다. */
  hasImageError: boolean;
  /** 칸 하나로 짚을 수 없는 검수 결과다. */
  notices: ReviewNotice[];
  /** 스토리 수정 문구(다시 저장)를 쓸지다. */
  isEdit?: boolean;
};

export function GeneralStoryReviewNotice({
  status,
  hasImageError,
  notices,
  isEdit = false,
}: GeneralStoryReviewNoticeProps) {
  const copy = GENERAL_STORY_REVIEW_COPY;
  const isPending = status === 'PENDING';
  const title = isPending
    ? copy.pendingTitle
    : status === 'REJECTED'
      ? copy.rejectedTitle
      : copy.failedTitle;
  const description = isPending
    ? copy.pendingDescription
    : status === 'REJECTED'
      ? isEdit
        ? copy.editRejectedDescription
        : copy.rejectedDescription
      : hasImageError
        ? isEdit
          ? copy.editFailedImageDescription
          : copy.failedImageDescription
        : isEdit
          ? copy.editFailedDescription
          : copy.failedDescription;

  return (
    <section
      role="status"
      aria-label={title}
      className={cn(
        'mx-4 mb-2 flex shrink-0 gap-2 rounded-2xl px-4 py-3 text-sm break-keep',
        isPending ? 'bg-muted' : 'bg-destructive/10',
      )}>
      <HugeiconsIcon
        icon={AlertCircleIcon}
        aria-hidden="true"
        className={cn(
          'mt-0.5 size-4 shrink-0',
          isPending ? 'text-foreground-secondary' : 'text-destructive',
        )}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className={cn(
            'font-semibold',
            isPending ? 'text-foreground' : 'text-destructive',
          )}>
          {title}
        </p>
        <p className="text-foreground-secondary">{description}</p>
        {notices.length > 0 && (
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-foreground-secondary">
            {notices.map(({ tab, message }, index) => (
              <li key={`${tab}-${index}`}>
                {tab
                  ? `${GENERAL_STORY_TABS.find(({ value }) => value === tab)?.label}: ${message}`
                  : message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
