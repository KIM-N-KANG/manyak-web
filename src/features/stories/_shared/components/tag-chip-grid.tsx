import type { ReactNode } from 'react';

import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleChip } from '@/components/ui/toggle-chip';
import {
  SKELETON_TAG_CHIP_WIDTH_CLASSES,
  TAG_LOAD_RETRY_LABEL,
} from '@/features/stories/_shared/constants/tag';

type TagChipGridProps = {
  /** 스켈레톤·칩 key를 화면 안에서 유일하게 만들기 위한 접두사 */
  keyPrefix: string;
  /** 서버가 내려 준 키워드. id나 이름이 없는 항목은 그리지 않는다. */
  predefinedTags: SimpleStoryTagListItemResponse[];
  /** 사용자가 직접 추가한 키워드. 서버 키워드 뒤에 이어 그린다. */
  customTags?: { id: string; name: string }[];
  selectedTagIds: number[];
  selectedCustomTagIds?: string[];
  /** 선택 상한에 닿았는지. 참이면 고르지 않은 칩만 비활성으로 두어 해제는 계속 할 수 있다. */
  isMaxSelectionReached: boolean;
  /** 참이면 칩 대신 스켈레톤을 그린다. */
  isLoadingTags: boolean;
  /** 참이면 칩 앞에 다시 시도 버튼을 그린다. */
  hasTagsError: boolean;
  /** 목록을 받지 못했을 때 다시 조회한다. */
  onRetryTags: () => void;
  /** 선택 여부와 관계없이 모든 칩을 비활성으로 둔다. 상한 규칙보다 우선한다. */
  disabled: boolean;
  /** 직접 추가를 허용하는 카테고리에서만 넘긴다. */
  addTagTrigger?: ReactNode;
  /** `pressed`가 참이면 선택, 거짓이면 해제다. */
  onTogglePredefinedTag: (tagId: number, pressed: boolean) => void;
  onToggleCustomTag?: (tagId: string, pressed: boolean) => void;
};

export function TagChipGrid({
  keyPrefix,
  predefinedTags,
  customTags = [],
  selectedTagIds,
  selectedCustomTagIds = [],
  isMaxSelectionReached,
  isLoadingTags,
  hasTagsError,
  onRetryTags,
  disabled,
  addTagTrigger,
  onTogglePredefinedTag,
  onToggleCustomTag,
}: TagChipGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {isLoadingTags &&
        SKELETON_TAG_CHIP_WIDTH_CLASSES.map((widthClass, index) => (
          <Skeleton
            key={`${keyPrefix}-tag-skeleton-${index}`}
            className={`h-10 ${widthClass}`}
            aria-hidden="true"
          />
        ))}
      {hasTagsError && (
        <button
          type="button"
          className="py-2 text-sm text-destructive underline-offset-4 hover:underline"
          onClick={onRetryTags}>
          {TAG_LOAD_RETRY_LABEL}
        </button>
      )}
      {!isLoadingTags &&
        predefinedTags.map((tag) => {
          const { id, name } = tag;

          if (id == null || !name) {
            return null;
          }

          const isSelected = selectedTagIds.includes(id);

          return (
            <ToggleChip
              key={`${keyPrefix}-${id}`}
              pressed={isSelected}
              className="aria-pressed:bg-primary/10"
              disabled={disabled || (!isSelected && isMaxSelectionReached)}
              onPressedChange={(pressed) => onTogglePredefinedTag(id, pressed)}>
              {name}
            </ToggleChip>
          );
        })}
      {!isLoadingTags &&
        customTags.map((customTag) => {
          const isSelected = selectedCustomTagIds.includes(customTag.id);

          return (
            <ToggleChip
              key={customTag.id}
              pressed={isSelected}
              className="aria-pressed:bg-primary/10"
              disabled={disabled || (!isSelected && isMaxSelectionReached)}
              onPressedChange={(pressed) =>
                onToggleCustomTag?.(customTag.id, pressed)
              }>
              {customTag.name}
            </ToggleChip>
          );
        })}
      {addTagTrigger}
    </div>
  );
}
