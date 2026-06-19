'use client';

import { useState } from 'react';

import { useGetSimpleStoryTags } from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';

import { TAG_CATEGORIES } from '../constants';
import type { CustomKeyword, TagCategory } from '../types';
import { createClientId } from '../utils/create-client-id';
import {
  createEmptyCustomKeywordsByCategory,
  createEmptySelectedCustomKeywordIdsByCategory,
  createEmptySelectedTagIdsByCategory,
  getMaxSelectionCount,
  getTagsByCategory,
} from '../utils/tag-categories';

type UseStoryKeywordStepArgs = {
  isGeneratingStoryline: boolean;
  onGenerateStoryline: (request: GenerateSimpleStorylinesRequest) => void;
};

export function useStoryKeywordStep({
  isGeneratingStoryline,
  onGenerateStoryline,
}: UseStoryKeywordStepArgs) {
  const [activeCategory, setActiveCategory] = useState<TagCategory>('GENRE');
  const [selectedTagIdsByCategory, setSelectedTagIdsByCategory] = useState(
    createEmptySelectedTagIdsByCategory,
  );
  const [
    selectedCustomKeywordIdsByCategory,
    setSelectedCustomKeywordIdsByCategory,
  ] = useState(createEmptySelectedCustomKeywordIdsByCategory);
  const [customKeywordsByCategory, setCustomKeywordsByCategory] = useState(
    createEmptyCustomKeywordsByCategory,
  );

  const simpleStoryTags = useGetSimpleStoryTags();

  const tagsByCategory = getTagsByCategory(simpleStoryTags.data?.data ?? []);

  const hasGenreKeyword =
    selectedTagIdsByCategory.GENRE.length > 0 ||
    selectedCustomKeywordIdsByCategory.GENRE.length > 0;
  const hasProtagonistKeyword =
    selectedTagIdsByCategory.PROTAGONIST.length > 0 ||
    selectedCustomKeywordIdsByCategory.PROTAGONIST.length > 0;
  const canGenerateStoryline = hasGenreKeyword && hasProtagonistKeyword;

  const getSelectedCount = (category: TagCategory) =>
    selectedTagIdsByCategory[category].length +
    selectedCustomKeywordIdsByCategory[category].length;

  const categoryValues = TAG_CATEGORIES.map(({ value }) => value);

  const isCategoryComplete = (category: TagCategory) =>
    getSelectedCount(category) > 0;

  const isCategoryUnlocked = (category: TagCategory) => {
    const index = categoryValues.indexOf(category);

    return TAG_CATEGORIES.slice(0, index).every(
      ({ value, required }) => !required || isCategoryComplete(value),
    );
  };

  const activeIndex = categoryValues.indexOf(activeCategory);
  const isLastCategory = activeIndex === categoryValues.length - 1;

  const goToNextCategory = () => {
    const nextCategory = categoryValues[activeIndex + 1];

    if (nextCategory) {
      setActiveCategory(nextCategory);
    }
  };

  const togglePredefinedTag = (
    category: TagCategory,
    tagId: number,
    pressed: boolean,
  ) => {
    setSelectedTagIdsByCategory((previous) => {
      const selectedTagIds = previous[category];

      if (!pressed) {
        return {
          ...previous,
          [category]: selectedTagIds.filter(
            (selectedTagId) => selectedTagId !== tagId,
          ),
        };
      }

      if (
        selectedTagIds.includes(tagId) ||
        selectedTagIds.length +
          selectedCustomKeywordIdsByCategory[category].length >=
          getMaxSelectionCount(category)
      ) {
        return previous;
      }

      return {
        ...previous,
        [category]: [...selectedTagIds, tagId],
      };
    });
  };

  const toggleCustomKeyword = (
    category: TagCategory,
    keywordId: string,
    pressed: boolean,
  ) => {
    setSelectedCustomKeywordIdsByCategory((previous) => {
      const selectedKeywordIds = previous[category];

      if (!pressed) {
        return {
          ...previous,
          [category]: selectedKeywordIds.filter(
            (selectedKeywordId) => selectedKeywordId !== keywordId,
          ),
        };
      }

      if (
        selectedKeywordIds.includes(keywordId) ||
        selectedTagIdsByCategory[category].length + selectedKeywordIds.length >=
          getMaxSelectionCount(category)
      ) {
        return previous;
      }

      return {
        ...previous,
        [category]: [...selectedKeywordIds, keywordId],
      };
    });
  };

  const addCustomKeyword = (category: TagCategory, keyword: string) => {
    if (getSelectedCount(category) >= getMaxSelectionCount(category)) {
      return;
    }

    const customKeyword: CustomKeyword = {
      id: createClientId(),
      name: keyword,
      category,
    };

    setCustomKeywordsByCategory((previous) => ({
      ...previous,
      [category]: [...previous[category], customKeyword],
    }));
    setSelectedCustomKeywordIdsByCategory((previous) => ({
      ...previous,
      [category]: [...previous[category], customKeyword.id],
    }));
  };

  const handleGenerateStoryline = () => {
    if (!canGenerateStoryline) {
      return;
    }

    const selectedTagIds = TAG_CATEGORIES.flatMap(
      ({ value }) => selectedTagIdsByCategory[value],
    );
    const customTags = TAG_CATEGORIES.flatMap(({ value }) =>
      customKeywordsByCategory[value]
        .filter((keyword) =>
          selectedCustomKeywordIdsByCategory[value].includes(keyword.id),
        )
        .map((keyword) => ({
          name: keyword.name,
          category: keyword.category,
        })),
    );

    const request: GenerateSimpleStorylinesRequest = {
      selectedTagIds: selectedTagIds,
      customTags: customTags,
    };

    onGenerateStoryline(request);
  };

  return {
    activeCategory,
    setActiveCategory,
    selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory,
    simpleStoryTags,
    isGeneratingStoryline,
    tagsByCategory,
    canGenerateStoryline,
    getSelectedCount,
    isCategoryComplete,
    isCategoryUnlocked,
    isLastCategory,
    goToNextCategory,
    togglePredefinedTag,
    toggleCustomKeyword,
    addCustomKeyword,
    handleGenerateStoryline,
  };
}
