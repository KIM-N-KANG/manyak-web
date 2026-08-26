'use client';

import { useState } from 'react';

import type { KeywordDraftSnapshot } from '@/features/stories/_shared/utils/creation-request-storage';
import { createClientId } from '@/lib/create-client-id';

import type { CustomTag } from '../types';
import { getMaxSelectionCount } from '../utils/tag-categories';

/**
 * 키워드 스텝의 장르 선택 상태를 관리하는 훅.
 * 제공 태그와 직접 추가 키워드를 함께 세어 상한(3개)을 판정한다.
 *
 * @returns 선택한 장르 태그·직접 추가 키워드와 토글·추가 함수
 */
export function useGenreSelection() {
  const [selectedGenreTagIds, setSelectedGenreTagIds] = useState<number[]>([]);
  const [selectedCustomGenreTagIds, setSelectedCustomGenreTagIds] = useState<
    string[]
  >([]);
  const [customGenreTags, setCustomGenreTags] = useState<CustomTag[]>([]);

  const selectedCount =
    selectedGenreTagIds.length + selectedCustomGenreTagIds.length;
  const isGenreMaxReached = selectedCount >= getMaxSelectionCount('GENRE');

  const toggleGenreTag = (tagId: number, pressed: boolean) => {
    setSelectedGenreTagIds((previous) => {
      if (!pressed) {
        return previous.filter((selectedId) => selectedId !== tagId);
      }

      if (previous.includes(tagId) || isGenreMaxReached) {
        return previous;
      }

      return [...previous, tagId];
    });
  };

  const toggleCustomGenreTag = (tagId: string, pressed: boolean) => {
    setSelectedCustomGenreTagIds((previous) => {
      if (!pressed) {
        return previous.filter((selectedId) => selectedId !== tagId);
      }

      if (previous.includes(tagId) || isGenreMaxReached) {
        return previous;
      }

      return [...previous, tagId];
    });
  };

  const addCustomGenreTag = (name: string) => {
    if (isGenreMaxReached) {
      return;
    }

    const customTag: CustomTag = { id: createClientId(), name };

    setCustomGenreTags((previous) => [...previous, customTag]);
    setSelectedCustomGenreTagIds((previous) => [...previous, customTag.id]);
  };

  /** 키워드 저장본으로 장르 제공 태그와 직접 추가 키워드를 복원한다. */
  const restoreGenreSelection = (snapshot: KeywordDraftSnapshot) => {
    const restoredCustomTags = snapshot.customGenreTags.map(({ name }) => ({
      id: createClientId(),
      name,
    }));

    setSelectedGenreTagIds(snapshot.selectedGenreTagIds);
    setCustomGenreTags(restoredCustomTags);
    setSelectedCustomGenreTagIds(
      restoredCustomTags
        .filter((_, index) => snapshot.customGenreTags[index]?.selected)
        .map(({ id }) => id),
    );
  };

  return {
    selectedGenreTagIds,
    selectedCustomGenreTagIds,
    customGenreTags,
    isGenreMaxReached,
    hasGenreTag: selectedCount > 0,
    // 선택 상태인 직접 추가 키워드만 요청에 싣는다.
    getSubmittedCustomGenreTags: () =>
      customGenreTags
        .filter((customTag) => selectedCustomGenreTagIds.includes(customTag.id))
        .map((customTag) => customTag.name),
    toggleGenreTag,
    toggleCustomGenreTag,
    addCustomGenreTag,
    restoreGenreSelection,
  };
}
