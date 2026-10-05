'use client';

import { useEffect, useState } from 'react';

import { keepPreviousData } from '@tanstack/react-query';

import { useGet2 } from '@/api/generated/endpoints/stories/stories';
import {
  GENRE_SEARCH_DEBOUNCE_MS,
  GENRE_SEARCH_LOADING_DELAY_MS,
} from '@/features/stories/_shared/constants/genre';
import { toGenres } from '@/features/stories/_shared/utils/genre-catalog';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';

/**
 * 장르 검색어와 서버 검색 결과를 관리하는 훅.
 * 초성·별칭 해석은 서버(`GET /stories/genres?query=`)에 맡기고, 입력을 멈춘 뒤에만 요청한다.
 * 새 결과를 받기 전에는 이전 결과를 유지하고, 요청이 오래 걸릴 때만 로딩 문구를 보이게 한다.
 * 받은 결과는 쿼리 캐시로 다시 쓴다. 콤보박스는 한글 조합이 끝나야 입력값을 알리므로, 화면은 입력 이벤트의
 * 값(조합 중인 글자 포함)도 `changeQuery`로 넘겨 보이는 검색어와 검색 결과가 어긋나지 않게 한다.
 *
 * @returns 입력 중인 검색어, 표시할 장르와 조회 상태, 검색어 변경·재시도 함수
 */
export function useGenreSearch() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const results = useGet2(search ? { query: search } : undefined, {
    query: { placeholderData: keepPreviousData },
  });

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) return;

    const timer = setTimeout(
      () => setSearch(trimmed),
      GENRE_SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [query]);

  // 이전 검색어의 결과를 보이며 새 결과를 기다리는 중이다. 같은 검색어의 재조회는 기다림으로 보지 않는다.
  const isWaiting =
    results.isFetching &&
    (results.isPlaceholderData || results.data === undefined);
  const showLoading = useDelayedLoading(isWaiting, {
    delay: GENRE_SEARCH_LOADING_DELAY_MS,
    minDuration: 0,
  });
  const isFailed =
    !results.isFetching &&
    (results.isError ||
      (results.data !== undefined && results.data.status !== 200));

  return {
    query,
    // 비운 검색어는 이미 받은 전체 목록을 바로 보인다.
    changeQuery: (value: string) => {
      setQuery(value);

      if (!value.trim()) setSearch('');
    },
    genres:
      results.data?.status === 200 ? toGenres(results.data.data.genres) : [],
    isWaiting,
    showLoading,
    isFailed,
    retry: () => void results.refetch(),
  };
}
