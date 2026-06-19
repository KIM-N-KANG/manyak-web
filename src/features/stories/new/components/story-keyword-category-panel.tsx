import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleChip } from '@/components/ui/toggle-chip';

import { SKELETON_TAG_CHIP_WIDTH_CLASSES } from '../constants';
import type { CustomKeyword, TagCategory } from '../types';
import { AddKeywordDialog } from './add-keyword-dialog';

type StoryKeywordCategoryPanelProps = {
  category: TagCategory;
  label: string;
  placeholder: string;
  maxSelectionCount: number;
  selectedCount: number;
  selectedTagIds: number[];
  selectedCustomKeywordIds: string[];
  predefinedTags: SimpleStoryTagListItemResponse[];
  customKeywords: CustomKeyword[];
  isLoadingTags: boolean;
  hasTagsError: boolean;
  isGeneratingStoryline: boolean;
  onTogglePredefinedTag: (
    category: TagCategory,
    tagId: number,
    pressed: boolean,
  ) => void;
  onToggleCustomKeyword: (
    category: TagCategory,
    keywordId: string,
    pressed: boolean,
  ) => void;
  onAddCustomKeyword: (category: TagCategory, keyword: string) => void;
};

export function StoryKeywordCategoryPanel({
  category,
  label,
  placeholder,
  maxSelectionCount,
  selectedCount,
  selectedTagIds,
  selectedCustomKeywordIds,
  predefinedTags,
  customKeywords,
  isLoadingTags,
  hasTagsError,
  isGeneratingStoryline,
  onTogglePredefinedTag,
  onToggleCustomKeyword,
  onAddCustomKeyword,
}: StoryKeywordCategoryPanelProps) {
  const isMaxSelectionReached = selectedCount >= maxSelectionCount;

  return (
    <div className="flex flex-col gap-2 pb-4">
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
          <p className="py-2 text-sm text-destructive">
            키워드를 불러오지 못했어요
          </p>
        )}
        {predefinedTags.map((tag) => {
          const { id, name } = tag;

          if (id == null || !name) {
            return null;
          }

          const isSelected = selectedTagIds.includes(id);
          const isKeywordChipDisabled =
            isGeneratingStoryline || (!isSelected && isMaxSelectionReached);

          return (
            <ToggleChip
              key={id}
              pressed={isSelected}
              disabled={isKeywordChipDisabled}
              onPressedChange={(pressed) =>
                onTogglePredefinedTag(category, id, pressed)
              }>
              {name}
            </ToggleChip>
          );
        })}
        {customKeywords.map((keyword) => {
          const isSelected = selectedCustomKeywordIds.includes(keyword.id);
          const isKeywordChipDisabled =
            isGeneratingStoryline || (!isSelected && isMaxSelectionReached);

          return (
            <ToggleChip
              key={keyword.id}
              pressed={isSelected}
              disabled={isKeywordChipDisabled}
              onPressedChange={(pressed) =>
                onToggleCustomKeyword(category, keyword.id, pressed)
              }>
              {keyword.name}
            </ToggleChip>
          );
        })}
        <AddKeywordDialog
          category={category}
          categoryLabel={label}
          placeholder={placeholder}
          disabled={isGeneratingStoryline || isMaxSelectionReached}
          onAddKeyword={(keyword) => onAddCustomKeyword(category, keyword)}
        />
      </div>
    </div>
  );
}
