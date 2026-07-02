'use client';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

import { getTagsByCategory } from '../utils/tag-categories';
import { useCategoryNavigation } from './use-category-navigation';
import { useTagSelection } from './use-tag-selection';

type UseStoryKeywordStepArgs = {
  isGeneratingStoryline: boolean;
  onGenerateStoryline: (request: GenerateSimpleStorylinesRequest) => void;
};

export function useStoryKeywordStep({
  isGeneratingStoryline,
  onGenerateStoryline,
}: UseStoryKeywordStepArgs) {
  const tagSelection = useTagSelection();
  const navigation = useCategoryNavigation({
    isCategoryComplete: tagSelection.isCategoryComplete,
  });

  const simpleStoryTags = useGetSimpleStoryTags();
  const showTagsSkeleton = useDelayedLoading(simpleStoryTags.isLoading);
  const tagsByCategory = getTagsByCategory(simpleStoryTags.data?.data ?? []);

  const handleGenerateStoryline = () => {
    if (!tagSelection.canGenerateStoryline) {
      return;
    }

    onGenerateStoryline(tagSelection.buildGenerateRequest());
  };

  return {
    activeCategory: navigation.activeCategory,
    changeCategory: navigation.changeCategory,
    selectedTagIdsByCategory: tagSelection.selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory:
      tagSelection.selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory: tagSelection.customKeywordsByCategory,
    simpleStoryTags,
    showTagsSkeleton,
    isGeneratingStoryline,
    tagsByCategory,
    canGenerateStoryline: tagSelection.canGenerateStoryline,
    isMaxSelectionReached: tagSelection.isMaxSelectionReached,
    isCategoryComplete: tagSelection.isCategoryComplete,
    isCategoryUnlocked: navigation.isCategoryUnlocked,
    isFirstCategory: navigation.isFirstCategory,
    isLastCategory: navigation.isLastCategory,
    goToNextCategory: navigation.goToNextCategory,
    goToPreviousCategory: navigation.goToPreviousCategory,
    togglePredefinedTag: tagSelection.togglePredefinedTag,
    toggleCustomKeyword: tagSelection.toggleCustomKeyword,
    addCustomKeyword: tagSelection.addCustomKeyword,
    handleGenerateStoryline,
  };
}
