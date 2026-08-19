'use client';

import { useState } from 'react';

import { getMaxSelectionCount } from '../utils/tag-categories';

/**
 * 키워드 스텝의 장르 태그 선택 상태를 관리하는 훅.
 * 장르는 서비스가 제공하는 태그만 고를 수 있어 직접 추가 태그를 다루지 않는다.
 *
 * @returns 선택한 장르 태그 ID 목록과 토글·상한 판별 함수
 */
export function useGenreSelection() {
  const [selectedGenreTagIds, setSelectedGenreTagIds] = useState<number[]>([]);

  const isGenreMaxReached =
    selectedGenreTagIds.length >= getMaxSelectionCount('GENRE');

  const toggleGenreTag = (tagId: number, pressed: boolean) => {
    setSelectedGenreTagIds((previous) => {
      if (!pressed) {
        return previous.filter((selectedId) => selectedId !== tagId);
      }

      if (
        previous.includes(tagId) ||
        previous.length >= getMaxSelectionCount('GENRE')
      ) {
        return previous;
      }

      return [...previous, tagId];
    });
  };

  return {
    selectedGenreTagIds,
    isGenreMaxReached,
    hasGenreTag: selectedGenreTagIds.length > 0,
    toggleGenreTag,
  };
}
