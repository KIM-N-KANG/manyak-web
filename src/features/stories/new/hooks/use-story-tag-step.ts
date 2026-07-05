'use client';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

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

  const simpleStoryTags = useGetSimpleStoryTags();
  const showTagsSkeleton = useDelayedLoading(simpleStoryTags.isLoading);
  const tagsByCategory = getTagsByCategory(simpleStoryTags.data?.data ?? []);

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
    canGenerateStorylines: tagSelection.canGenerateStorylines,
    isMaxSelectionReached: tagSelection.isMaxSelectionReached,
    isCategoryComplete: tagSelection.isCategoryComplete,
    isCategoryUnlocked: navigation.isCategoryUnlocked,
    isFirstCategory: navigation.isFirstCategory,
    isLastCategory: navigation.isLastCategory,
    goToNextCategory: navigation.goToNextCategory,
    goToPreviousCategory: navigation.goToPreviousCategory,
    togglePredefinedTag: tagSelection.togglePredefinedTag,
    toggleCustomTag: tagSelection.toggleCustomTag,
    addCustomTag: tagSelection.addCustomTag,
    handleGenerateStorylines,
  };
}
