'use client';

import { useState } from 'react';

import {
  useGenerateSimpleStorylines,
  useGetSimpleStoryTags,
} from '@/api/generated/endpoints/simple-story-creation/simple-story-creation';
import type { SimpleStoryTagListItemResponse } from '@/api/generated/models';

import { TAG_CATEGORIES } from '../constants';
import type {
  CustomKeyword,
  CustomKeywordsByCategory,
  SelectedCustomKeywordIdsByCategory,
  SelectedTagIdsByCategory,
  TagCategory,
  TagsByCategory,
} from '../types';

const createEmptySelectedTagIdsByCategory = (): SelectedTagIdsByCategory => ({
  GENRE: [],
  PROTAGONIST: [],
  SUPPORTING_CHARACTER: [],
});

const createEmptySelectedCustomKeywordIdsByCategory =
  (): SelectedCustomKeywordIdsByCategory => ({
    GENRE: [],
    PROTAGONIST: [],
    SUPPORTING_CHARACTER: [],
  });

const createEmptyCustomKeywordsByCategory = (): CustomKeywordsByCategory => ({
  GENRE: [],
  PROTAGONIST: [],
  SUPPORTING_CHARACTER: [],
});

const createEmptyTagsByCategory = (): TagsByCategory => ({
  GENRE: [],
  PROTAGONIST: [],
  SUPPORTING_CHARACTER: [],
});

const getMaxSelectionCount = (category: TagCategory) =>
  TAG_CATEGORIES.find((item) => item.value === category)?.maxSelectionCount ??
  0;

const getTagsByCategory = (
  tags: SimpleStoryTagListItemResponse[],
): TagsByCategory =>
  TAG_CATEGORIES.reduce<TagsByCategory>((acc, { value: category }) => {
    acc[category] = tags.filter((tag) => tag.category === category);

    return acc;
  }, createEmptyTagsByCategory());

export function useStoryKeywordStep() {
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
  const generateStorylines = useGenerateSimpleStorylines();

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
      id: crypto.randomUUID(),
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

    generateStorylines.mutate({
      data: {
        selectedTagIds: selectedTagIds,
        customTags: customTags,
      },
    });
  };

  return {
    activeCategory,
    setActiveCategory,
    selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory,
    simpleStoryTags,
    generateStorylines,
    tagsByCategory,
    canGenerateStoryline,
    getSelectedCount,
    togglePredefinedTag,
    toggleCustomKeyword,
    addCustomKeyword,
    handleGenerateStoryline,
  };
}
