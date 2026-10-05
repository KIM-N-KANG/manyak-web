'use client';

import { useState } from 'react';

import type { KeywordDraftSnapshot } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  type GenreCatalog,
  getGenreChips,
} from '@/features/stories/_shared/utils/genre-catalog';

import {
  EMPTY_SIMPLE_GENRE_SELECTION,
  resolveSimpleGenreSelection,
  type SimpleGenreSelection,
  toggleSimpleGenre,
} from '../utils/genre-selection';
import { getMaxSelectionCount } from '../utils/tag-categories';

/**
 * 키워드 스텝의 장르 선택 상태를 관리하는 훅.
 * 제공 장르만 고르며 상한은 3개다. 화면과 요청은 제공 장르 목록에 맞춰 정리한 선택을 쓰고,
 * 정리한 값은 사용자가 장르를 바꿀 때 상태에 반영한다.
 *
 * @param catalog 제공 장르 목록. 받기 전이면 undefined
 * @returns 고른 장르와 칩, 저장 스냅숏, 토글·복원 함수
 */
export function useGenreSelection(catalog: GenreCatalog | undefined) {
  const [selection, setSelection] = useState<SimpleGenreSelection>(
    EMPTY_SIMPLE_GENRE_SELECTION,
  );
  const resolved = resolveSimpleGenreSelection(selection, catalog);
  const view = resolved.selection;

  const toggleGenreTag = (tagId: number, pressed: boolean) => {
    if (!catalog) return;

    const next = toggleSimpleGenre(view, catalog, tagId, pressed);

    if (next !== view) setSelection(next);
  };

  /** 키워드 저장본으로 장르 선택을 복원한다. 제공 장르 목록에 맞춘 정리는 화면이 그릴 때 한다. */
  const restoreGenreSelection = (snapshot: KeywordDraftSnapshot) => {
    setSelection({
      selectedIds: snapshot.selectedGenreTagIds,
      addedIds: snapshot.addedGenreTagIds ?? [],
      legacyTags: snapshot.customGenreTags,
    });
  };

  return {
    selectedGenreTagIds: view.selectedIds,
    genreChips: catalog
      ? getGenreChips(catalog, view.addedIds, view.selectedIds)
      : [],
    isGenreMaxReached: view.selectedIds.length >= getMaxSelectionCount('GENRE'),
    hasGenreTag: view.selectedIds.length > 0,
    needsGenreReselection: resolved.needsReselection,
    // 저장본은 정리 전 상태로 만들어, 제공 장르 목록을 받은 것만으로 저장할 변경이 생기지 않게 한다.
    genreSnapshot: {
      selectedGenreTagIds: selection.selectedIds,
      addedGenreTagIds: selection.addedIds,
      customGenreTags: selection.legacyTags,
    } satisfies Pick<
      KeywordDraftSnapshot,
      'selectedGenreTagIds' | 'addedGenreTagIds' | 'customGenreTags'
    >,
    toggleGenreTag,
    restoreGenreSelection,
  };
}
