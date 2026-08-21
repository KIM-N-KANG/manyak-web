import type { ReactNode } from 'react';

import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleChip } from '@/components/ui/toggle-chip';

import { SKELETON_TAG_CHIP_WIDTH_CLASSES } from '../../constants';
import type { CustomTag } from '../../types';
import { StoryCreateErrorMessage } from '../shared/story-create-error-message';

type TagChipGridProps = {
  /** 스켈레톤·칩 key를 화면 안에서 유일하게 만들기 위한 접두사 */
  keyPrefix: string;
  predefinedTags: SimpleStoryTagListItemResponse[];
  customTags: CustomTag[];
  selectedTagIds: number[];
  selectedCustomTagIds: string[];
  isMaxSelectionReached: boolean;
  isLoadingTags: boolean;
  hasTagsError: boolean;
  disabled: boolean;
  /** 직접 추가를 허용하는 카테고리에서만 넘긴다. */
  addTagTrigger?: ReactNode;
  onTogglePredefinedTag: (tagId: number, pressed: boolean) => void;
  onToggleCustomTag: (tagId: string, pressed: boolean) => void;
};

export function TagChipGrid({
  keyPrefix,
  predefinedTags,
  customTags,
  selectedTagIds,
  selectedCustomTagIds,
  isMaxSelectionReached,
  isLoadingTags,
  hasTagsError,
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
        <StoryCreateErrorMessage className="py-2">
          키워드를 불러오지 못했어요
        </StoryCreateErrorMessage>
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
              disabled={disabled || (!isSelected && isMaxSelectionReached)}
              onPressedChange={(pressed) =>
                onToggleCustomTag(customTag.id, pressed)
              }>
              {customTag.name}
            </ToggleChip>
          );
        })}
      {addTagTrigger}
    </div>
  );
}
