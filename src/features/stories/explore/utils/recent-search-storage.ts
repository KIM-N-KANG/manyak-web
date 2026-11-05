import { useSyncExternalStore } from 'react';

import {
  RECENT_SEARCHES_LIMIT,
  RECENT_SEARCHES_STORAGE_KEY,
} from '@/features/stories/_shared/constants/explore-search';

/**
 * 스토리 검색 화면의 최근 검색어 저장소다.
 *
 * 서버에 검색 기록 API가 없어 기기 단위로 둔다. 제출한 검색어를 최신순으로 최대 10개 남기고, 같은 검색어를
 * 다시 찾으면 맨 앞으로 옮긴다. 로그인 여부와 관계없이 이 기기의 기록을 보인다.
 */

const EMPTY_TERMS: readonly string[] = [];

const listeners = new Set<() => void>();

/**
 * 이 탭의 기록 변경과 다른 탭의 저장소 변경을 함께 구독한다.
 *
 * @param listener 변경 시 부를 함수
 * @returns 구독을 끊는 함수
 */
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

/**
 * 이 탭의 구독자에게 기록이 바뀌었다고 알린다.
 *
 * @returns 없음
 */
const emit = () => listeners.forEach((listener) => listener());

/**
 * 저장값을 검색어 배열로 해석한다. 배열이 아니거나 문자열이 아닌 항목이 섞이면 빈 목록으로 본다.
 *
 * @param raw 저장소 원문(없으면 null)
 * @returns 최신순 검색어 배열
 */
export function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) &&
      parsed.every((term): term is string => typeof term === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}

/**
 * 검색어 목록 앞에 새 검색어를 넣는다. 이미 있으면 맨 앞으로 옮기고 상한을 넘기면 뒤를 자른다.
 *
 * @param terms 기존 검색어 목록
 * @param term 새로 제출한 검색어(앞뒤 공백을 뺀 값)
 * @returns 새 목록
 */
export function prependRecentSearch(
  terms: readonly string[],
  term: string,
): string[] {
  return [term, ...terms.filter((saved) => saved !== term)].slice(
    0,
    RECENT_SEARCHES_LIMIT,
  );
}

let cachedRaw: string | null | undefined;
let cachedTerms: readonly string[] = EMPTY_TERMS;

/**
 * 최근 검색어를 읽는다. 서버 렌더링과 저장소 차단 환경에서는 빈 목록이다.
 * 원문이 같으면 같은 배열을 돌려줘 `useSyncExternalStore`가 다시 그리지 않게 한다.
 *
 * @returns 최신순 검색어 배열
 */
function readRecentSearches(): readonly string[] {
  if (typeof window === 'undefined') return EMPTY_TERMS;

  let raw: string | null;

  try {
    raw = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    return EMPTY_TERMS;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedTerms = parseRecentSearches(raw);
  }

  return cachedTerms;
}

/**
 * 검색어 목록을 저장하고 구독자에게 알린다. 빈 목록이면 키를 지운다.
 *
 * @param terms 저장할 최신순 검색어 목록
 */
const writeRecentSearches = (terms: readonly string[]) => {
  try {
    if (terms.length === 0) {
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        RECENT_SEARCHES_STORAGE_KEY,
        JSON.stringify(terms),
      );
    }
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }

  emit();
};

/**
 * 제출한 검색어를 최근 검색어 맨 앞에 기록한다.
 *
 * @param term 제출한 검색어(앞뒤 공백을 뺀 값)
 */
export function addRecentSearch(term: string): void {
  writeRecentSearches(prependRecentSearch(readRecentSearches(), term));
}

/**
 * 최근 검색어 하나를 지운다.
 *
 * @param term 지울 검색어
 */
export function removeRecentSearch(term: string): void {
  writeRecentSearches(readRecentSearches().filter((saved) => saved !== term));
}

/** 최근 검색어를 모두 지운다. */
export function clearRecentSearches(): void {
  writeRecentSearches(EMPTY_TERMS);
}

/**
 * 최근 검색어를 구독하는 훅. 기록하거나 지우면 화면이 바로 갱신된다.
 *
 * @returns 최신순 검색어 배열(서버 렌더링에서는 빈 목록)
 */
export function useRecentSearches(): readonly string[] {
  return useSyncExternalStore(subscribe, readRecentSearches, () => EMPTY_TERMS);
}
