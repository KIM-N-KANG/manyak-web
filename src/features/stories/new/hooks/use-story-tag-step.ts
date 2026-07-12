'use client';

import { useState } from 'react';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

import type { TagCategory } from '../types';
import { getTagsByCategory } from '../utils/tag-categories';
import { useCategoryNavigation } from './use-category-navigation';
import { useTagSelection } from './use-tag-selection';

type UseStoryTagStepArgs = {
  isGeneratingStorylines: boolean;
  onGenerateStorylines: (request: GenerateSimpleStorylinesRequest) => void;
};

/**
 * 키워드 스텝의 태그 선택과 카테고리 이동을 묶어 화면에 필요한 상태로 제공하는 훅.
 */
export function useStoryTagStep({
  isGeneratingStorylines,
  onGenerateStorylines,
}: UseStoryTagStepArgs) {
  const tagSelection = useTagSelection();
  const navigation = useCategoryNavigation({
    isCategoryComplete: tagSelection.isCategoryComplete,
  });
  const [validationErrorCategory, setValidationErrorCategory] =
    useState<TagCategory | null>(null);

  const simpleStoryTags = useGetSimpleStoryTags();
  const showTagsSkeleton = useDelayedLoading(simpleStoryTags.isLoading);
  const tagsByCategory = getTagsByCategory(simpleStoryTags.data?.data ?? []);

  const clearValidationErrorOnSelection = (
    category: TagCategory,
    pressed = true,
  ) => {
    if (!pressed) {
      return;
    }

    setValidationErrorCategory((previous) =>
      previous === category ? null : previous,
    );
  };

  const togglePredefinedTag = (
    category: TagCategory,
    tagId: number,
    pressed: boolean,
  ) => {
    clearValidationErrorOnSelection(category, pressed);
    tagSelection.togglePredefinedTag(category, tagId, pressed);
  };

  const toggleCustomTag = (
    category: TagCategory,
    tagId: string,
    pressed: boolean,
  ) => {
    clearValidationErrorOnSelection(category, pressed);
    tagSelection.toggleCustomTag(category, tagId, pressed);
  };

  const addCustomTag = (category: TagCategory, tag: string) => {
    clearValidationErrorOnSelection(category);
    tagSelection.addCustomTag(category, tag);
  };

  const goToNextCategory = () => {
    if (!tagSelection.isCategoryComplete(navigation.activeCategory)) {
      setValidationErrorCategory(navigation.activeCategory);

      return;
    }

    setValidationErrorCategory(null);
    navigation.goToNextCategory();
  };

  const handleGenerateStorylines = () => {
    if (!tagSelection.canGenerateStorylines) {
      return;
    }

    onGenerateStorylines(tagSelection.buildGenerateRequest());
  };

  return {
    activeCategory: navigation.activeCategory,
    changeCategory: navigation.changeCategory,
    selectedTagIdsByCategory: tagSelection.selectedTagIdsByCategory,
    selectedCustomTagIdsByCategory: tagSelection.selectedCustomTagIdsByCategory,
    customTagsByCategory: tagSelection.customTagsByCategory,
    simpleStoryTags,
    showTagsSkeleton,
    isGeneratingStorylines,
    tagsByCategory,
    hasCategoryValidationError:
      validationErrorCategory === navigation.activeCategory,
    isMaxSelectionReached: tagSelection.isMaxSelectionReached,
    isCategoryUnlocked: navigation.isCategoryUnlocked,
    isFirstCategory: navigation.isFirstCategory,
    isLastCategory: navigation.isLastCategory,
    goToNextCategory,
    goToPreviousCategory: navigation.goToPreviousCategory,
    togglePredefinedTag,
    toggleCustomTag,
    addCustomTag,
    handleGenerateStorylines,
  };
}
