'use client';

import { type Dispatch, type SetStateAction, useState } from 'react';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { createClientId } from '@/lib/create-client-id';

import { TAG_CATEGORIES } from '../constants';
import type { CustomKeyword, TagCategory } from '../types';
import {
  createEmptyCustomKeywordsByCategory,
  createEmptySelectedCustomKeywordIdsByCategory,
  createEmptySelectedTagIdsByCategory,
  getMaxSelectionCount,
} from '../utils/tag-categories';

/**
 * 키워드 스텝의 태그/커스텀 키워드 선택 상태와 그에 파생되는 규칙을 관리한다.
 */
export function useTagSelection() {
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

  const getSelectedCount = (category: TagCategory) =>
    selectedTagIdsByCategory[category].length +
    selectedCustomKeywordIdsByCategory[category].length;

  const isMaxSelectionReached = (category: TagCategory) =>
    getSelectedCount(category) >= getMaxSelectionCount(category);

  const isCategoryComplete = (category: TagCategory) =>
    getSelectedCount(category) > 0;

  const hasGenreKeyword =
    selectedTagIdsByCategory.GENRE.length > 0 ||
    selectedCustomKeywordIdsByCategory.GENRE.length > 0;
  const hasProtagonistKeyword =
    selectedTagIdsByCategory.PROTAGONIST.length > 0 ||
    selectedCustomKeywordIdsByCategory.PROTAGONIST.length > 0;
  const canGenerateStoryline = hasGenreKeyword && hasProtagonistKeyword;

  const createToggleSelection =
    <Id>(
      setSelectedIdsByCategory: Dispatch<
        SetStateAction<Record<TagCategory, Id[]>>
      >,
    ) =>
    (category: TagCategory, id: Id, pressed: boolean) => {
      setSelectedIdsByCategory((previous) => {
        const selectedIds = previous[category];

        if (!pressed) {
          return {
            ...previous,
            [category]: selectedIds.filter((selectedId) => selectedId !== id),
          };
        }

        if (selectedIds.includes(id) || isMaxSelectionReached(category)) {
          return previous;
        }

        return {
          ...previous,
          [category]: [...selectedIds, id],
        };
      });
    };

  const togglePredefinedTag = createToggleSelection(
    setSelectedTagIdsByCategory,
  );
  const toggleCustomKeyword = createToggleSelection(
    setSelectedCustomKeywordIdsByCategory,
  );

  const addCustomKeyword = (category: TagCategory, keyword: string) => {
    if (isMaxSelectionReached(category)) {
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

  const buildGenerateRequest = (): GenerateSimpleStorylinesRequest => {
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

    return {
      selectedTagIds: selectedTagIds,
      customTags: customTags,
    };
  };

  return {
    selectedTagIdsByCategory,
    selectedCustomKeywordIdsByCategory,
    customKeywordsByCategory,
    isMaxSelectionReached,
    isCategoryComplete,
    canGenerateStoryline,
    togglePredefinedTag,
    toggleCustomKeyword,
    addCustomKeyword,
    buildGenerateRequest,
  };
}
