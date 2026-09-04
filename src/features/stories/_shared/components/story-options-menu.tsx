'use client';

import { useState } from 'react';

import { Alert02Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import type { VariantProps } from 'class-variance-authority';

import {
  OptionsMenu,
  type OptionsMenuItem,
} from '@/components/common/options-menu';
import type { buttonVariants } from '@/components/ui/button';
import { StoryReportSheet } from '@/features/stories/_shared/components/story-report-sheet';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';
import { useDeleteCreatedStory } from '@/features/stories/_shared/hooks/use-delete-created-story';
import type { ReportSource } from '@/observability/analytics';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

/**
 * 스토리 헤더 더보기 메뉴의 props. 신고하기(회원만)와 삭제하기(내가 만든 스토리만)를 담고,
 * 둘 다 없으면 트리거도 그리지 않는다. 신고 항목은 파괴적 항목인 삭제하기 위에 둔다.
 */
type StoryOptionsMenuProps = {
  storyId: string;
  source: ReportSource;
  canReport: boolean;
  canDelete: boolean;
  onDeleteSuccess?: () => void;
  size?: ButtonSize;
  triggerClassName?: string;
};

export function StoryOptionsMenu({
  storyId,
  source,
  canReport,
  canDelete,
  onDeleteSuccess,
  size = 'icon-xs',
  triggerClassName,
}: StoryOptionsMenuProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { deleteStory, isPending } = useDeleteCreatedStory(
    storyId,
    onDeleteSuccess,
  );

  const items: OptionsMenuItem[] = [];

  if (canReport) {
    items.push({
      icon: Alert02Icon,
      label: STORY_REPORT_COPY.action,
      onSelect: () => setIsReportOpen(true),
    });
  }

  if (canDelete) {
    items.push({
      icon: Delete02Icon,
      label: '삭제하기',
      variant: 'destructive',
      onSelect: deleteStory,
      confirm: { title: '스토리를 삭제할까요?', isPending },
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <OptionsMenu
        triggerAriaLabel="스토리 옵션 더보기"
        size={size}
        triggerClassName={triggerClassName}
        items={items}
      />
      {canReport && (
        <StoryReportSheet
          storyId={storyId}
          source={source}
          open={isReportOpen}
          onOpenChange={setIsReportOpen}
        />
      )}
    </>
  );
}
