import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import {
  GENERAL_STORY_REVIEW_COPY,
  GENERAL_STORY_TABS,
} from '@/features/studio/general/constants';
import type { GeneralStoryReviewNotice as ReviewNotice } from '@/features/studio/general/utils/review-issues';

type GeneralStoryReviewNoticeProps = {
  status: 'REJECTED' | 'FAILED';
  /** 이미지 문제로 검토를 마치지 못했는지다. 실패 안내 문구를 고른다. */
  hasImageError: boolean;
  /** 칸 하나로 짚을 수 없는 검수 결과다. */
  notices: ReviewNotice[];
};

export function GeneralStoryReviewNotice({
  status,
  hasImageError,
  notices,
}: GeneralStoryReviewNoticeProps) {
  const copy = GENERAL_STORY_REVIEW_COPY;
  const title = status === 'REJECTED' ? copy.rejectedTitle : copy.failedTitle;
  const description =
    status === 'REJECTED'
      ? copy.rejectedDescription
      : hasImageError
        ? copy.failedImageDescription
        : copy.failedDescription;

  return (
    <section
      role="status"
      aria-label={title}
      className="mx-4 mb-2 flex shrink-0 gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm break-keep">
      <HugeiconsIcon
        icon={AlertCircleIcon}
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-destructive"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold text-destructive">{title}</p>
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
