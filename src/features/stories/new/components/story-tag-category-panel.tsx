import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleChip } from '@/components/ui/toggle-chip';

import { SKELETON_TAG_CHIP_WIDTH_CLASSES } from '../constants';
import type { CustomTag, TagCategory } from '../types';
import { AddTagDialog } from './add-tag-dialog';
import { StoryCreateErrorMessage } from './story-create-error-message';

type StoryTagCategoryPanelProps = {
  category: TagCategory;
  label: string;
  placeholder: string;
  maxSelectionCount: number;
  isMaxSelectionReached: boolean;
  selectedTagIds: number[];
  selectedCustomTagIds: string[];
  predefinedTags: SimpleStoryTagListItemResponse[];
  customTags: CustomTag[];
  isLoadingTags: boolean;
  hasTagsError: boolean;
  isGeneratingStoryline: boolean;
  onTogglePredefinedTag: (
    category: TagCategory,
    tagId: number,
    pressed: boolean,
  ) => void;
  onToggleCustomTag: (
    category: TagCategory,
    tagId: string,
    pressed: boolean,
  ) => void;
  onAddCustomTag: (category: TagCategory, tag: string) => void;
};

export function StoryTagCategoryPanel({
  category,
  label,
  placeholder,
  maxSelectionCount,
  isMaxSelectionReached,
  selectedTagIds,
  selectedCustomTagIds,
  predefinedTags,
  customTags,
  isLoadingTags,
  hasTagsError,
  isGeneratingStoryline,
  onTogglePredefinedTag,
  onToggleCustomTag,
  onAddCustomTag,
}: StoryTagCategoryPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-foreground-secondary">
        최대 {maxSelectionCount}개까지 선택할 수 있어요
      </p>
      <div className="flex flex-wrap gap-2">
        {isLoadingTags && (
          <>
            {SKELETON_TAG_CHIP_WIDTH_CLASSES.map((widthClass, index) => (
              <Skeleton
                key={`${category}-tag-skeleton-${index}`}
                className={`h-10 ${widthClass}`}
                aria-hidden="true"
              />
            ))}
          </>
        )}
        {hasTagsError && (
          <StoryCreateErrorMessage className="py-2">
            키워드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
          </StoryCreateErrorMessage>
        )}
        {!isLoadingTags &&
          predefinedTags.map((tag) => {
            const { id, name } = tag;

            if (id == null || !name) {
              return null;
            }

            const isSelected = selectedTagIds.includes(id);
            const isTagChipDisabled =
              isGeneratingStoryline || (!isSelected && isMaxSelectionReached);

            return (
              <ToggleChip
                key={id}
                pressed={isSelected}
                disabled={isTagChipDisabled}
                onPressedChange={(pressed) =>
                  onTogglePredefinedTag(category, id, pressed)
                }>
                {name}
              </ToggleChip>
            );
          })}
        {!isLoadingTags &&
          customTags.map((customTag) => {
            const isSelected = selectedCustomTagIds.includes(customTag.id);
            const isTagChipDisabled =
              isGeneratingStoryline || (!isSelected && isMaxSelectionReached);

            return (
              <ToggleChip
                key={customTag.id}
                pressed={isSelected}
                disabled={isTagChipDisabled}
                onPressedChange={(pressed) =>
                  onToggleCustomTag(category, customTag.id, pressed)
                }>
                {customTag.name}
              </ToggleChip>
            );
          })}
        <AddTagDialog
          category={category}
          categoryLabel={label}
          placeholder={placeholder}
          disabled={isGeneratingStoryline || isMaxSelectionReached}
          onAddTag={(tag) => onAddCustomTag(category, tag)}
        />
      </div>
    </div>
  );
}
