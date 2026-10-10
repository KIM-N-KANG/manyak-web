'use client';

import { useState } from 'react';

import {
  Alert02Icon,
  Delete02Icon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';
import type { VariantProps } from 'class-variance-authority';
import { useRouter } from 'next/navigation';

import {
  CardOptionsSheet,
  type CardOptionsSheetItem,
} from '@/components/common/card-options-sheet';
import type { buttonVariants } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryReportSheet } from '@/features/stories/_shared/components/story-report-sheet';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';
import { useDeleteCreatedStory } from '@/features/stories/_shared/hooks/use-delete-created-story';
import { leaveLayers } from '@/lib/history-layers';
import type { ReportSource } from '@/observability/analytics';

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

/**
 * 스토리 더보기 메뉴(옵션 바텀 시트)의 props. 수정하기(회원이 만든 스토리만), 신고하기(회원만),
 * 삭제하기(내가 만든 스토리만)를 담고, 셋 다 없으면 트리거도 그리지 않는다. 수정하기를 맨 위에,
 * 파괴적 항목인 삭제하기를 맨 아래에 둔다.
 */
type StoryOptionsMenuProps = {
  storyId: string;
  /** 시트 머리글에 보일 스토리 제목 */
  title: string;
  source: ReportSource;
  /** 수정하기 노출 여부(회원이 만든 스토리만) */
  canEdit?: boolean;
  canReport: boolean;
  canDelete: boolean;
  onDeleteSuccess?: () => void;
  size?: ButtonSize;
  triggerClassName?: string;
};

export function StoryOptionsMenu({
  storyId,
  title,
  source,
  canEdit = false,
  canReport,
  canDelete,
  onDeleteSuccess,
  size = 'icon-xs',
  triggerClassName,
}: StoryOptionsMenuProps) {
  const router = useRouter();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { deleteStory, isPending } = useDeleteCreatedStory(
    storyId,
    onDeleteSuccess,
  );

  const items: CardOptionsSheetItem[] = [];

  if (canEdit) {
    items.push({
      icon: Edit02Icon,
      label: '수정하기',
      // 옵션 시트의 더미를 먼저 소비해 수정 화면에서 뒤로가기 한 번에 돌아오게 한다.
      onSelect: () =>
        leaveLayers(() => router.push(APP_PATH.STORY_EDIT(storyId))),
    });
  }

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
      <CardOptionsSheet
        kind={canDelete ? '내가 만든 스토리' : '스토리'}
        title={title}
        triggerAriaLabel="스토리 옵션 더보기"
        triggerSize={size}
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
