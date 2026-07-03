'use client';

import { type Dispatch, type SetStateAction, useState } from 'react';

import type { GenerateSimpleStorylinesRequest } from '@/api/generated/models';
import { createClientId } from '@/lib/create-client-id';

import { TAG_CATEGORIES } from '../constants';
import type { CustomTag, TagCategory } from '../types';
import {
  createEmptyCustomTagsByCategory,
  createEmptySelectedCustomTagIdsByCategory,
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
  const [selectedCustomTagIdsByCategory, setSelectedCustomTagIdsByCategory] =
    useState(createEmptySelectedCustomTagIdsByCategory);
  const [customTagsByCategory, setCustomTagsByCategory] = useState(
    createEmptyCustomTagsByCategory,
  );

  const getSelectedCount = (category: TagCategory) =>
    selectedTagIdsByCategory[category].length +
    selectedCustomTagIdsByCategory[category].length;

  const isMaxSelectionReached = (category: TagCategory) =>
    getSelectedCount(category) >= getMaxSelectionCount(category);

  const isCategoryComplete = (category: TagCategory) =>
    getSelectedCount(category) > 0;

  const hasGenreTag =
    selectedTagIdsByCategory.GENRE.length > 0 ||
    selectedCustomTagIdsByCategory.GENRE.length > 0;
  const hasProtagonistTag =
    selectedTagIdsByCategory.PROTAGONIST.length > 0 ||
    selectedCustomTagIdsByCategory.PROTAGONIST.length > 0;
  const canGenerateStorylines = hasGenreTag && hasProtagonistTag;

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
  const toggleCustomTag = createToggleSelection(
    setSelectedCustomTagIdsByCategory,
  );

  const addCustomTag = (category: TagCategory, tag: string) => {
    if (isMaxSelectionReached(category)) {
      return;
    }

    const customTag: CustomTag = {
      id: createClientId(),
      name: tag,
      category,
    };

    setCustomTagsByCategory((previous) => ({
      ...previous,
      [category]: [...previous[category], customTag],
    }));
    setSelectedCustomTagIdsByCategory((previous) => ({
      ...previous,
      [category]: [...previous[category], customTag.id],
    }));
  };

  const buildGenerateRequest = (): GenerateSimpleStorylinesRequest => {
    const selectedTagIds = TAG_CATEGORIES.flatMap(
      ({ value }) => selectedTagIdsByCategory[value],
    );
    const customTags = TAG_CATEGORIES.flatMap(({ value }) =>
      customTagsByCategory[value]
        .filter((customTag) =>
          selectedCustomTagIdsByCategory[value].includes(customTag.id),
        )
        .map((customTag) => ({
          name: customTag.name,
          category: customTag.category,
        })),
    );

    return {
      selectedTagIds: selectedTagIds,
      customTags: customTags,
    };
  };

  return {
    selectedTagIdsByCategory,
    selectedCustomTagIdsByCategory,
    customTagsByCategory,
    isMaxSelectionReached,
    isCategoryComplete,
    canGenerateStorylines,
    togglePredefinedTag,
    toggleCustomTag,
    addCustomTag,
    buildGenerateRequest,
  };
}
