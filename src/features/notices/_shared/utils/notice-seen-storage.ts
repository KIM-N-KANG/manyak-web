import { useSyncExternalStore } from 'react';

import { NOTICE_SEEN_STORAGE_KEY } from '../constants';

/**
 * 새 공지 표시의 기준이 되는 "마지막으로 본 게시 시각" 저장소다.
 *
 * 서버에 읽음 기록 API가 없어 기기 단위로 둔다. 공지 목록을 열면 그때 가장 최신 공지의
 * `publishedAt`을 기록하고, 그보다 늦게 게시된 공지가 있으면 헤더 버튼에 점을 찍고 목록 줄 제목 끝에 점을 단다.
 * 한 번도 연 적이 없으면(값 없음) 공지가 하나라도 있을 때 새 공지로 본다.
 */

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

const emit = () => listeners.forEach((listener) => listener());

/**
 * 게시 시각이 마지막으로 본 시각보다 늦은지 판정한다.
 *
 * @param publishedAt 공지의 게시 시각(ISO). 없으면 새 공지로 보지 않는다
 * @param lastSeenAt 마지막으로 본 게시 시각(ISO). 없으면 모든 공지가 새 공지다
 * @returns 새 공지면 true
 */
export function isNoticeUnread(
  publishedAt: string | undefined,
  lastSeenAt: string | null,
): boolean {
  if (!publishedAt) return false;

  if (lastSeenAt === null) return true;

  const published = Date.parse(publishedAt);
  const seen = Date.parse(lastSeenAt);

  if (Number.isNaN(published)) return false;

  if (Number.isNaN(seen)) return true;

  return published > seen;
}

/**
 * 마지막으로 본 게시 시각을 읽는다. 서버 렌더링과 저장소 차단 환경에서는 없는 것으로 본다.
 *
 * @returns ISO 문자열 또는 null
 */
export function readNoticeLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(NOTICE_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 공지 목록을 열었을 때 가장 최신 공지의 게시 시각을 기록한다. 이미 기록된 시각보다 이르면 덮지 않는다.
 *
 * @param latestPublishedAt 목록 첫 공지의 게시 시각(ISO)
 */
export function markNoticesSeen(latestPublishedAt: string | undefined): void {
  if (
    !latestPublishedAt ||
    !isNoticeUnread(latestPublishedAt, readNoticeLastSeenAt())
  ) {
    return;
  }

  try {
    window.localStorage.setItem(NOTICE_SEEN_STORAGE_KEY, latestPublishedAt);
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }

  emit();
}

/**
 * 마지막으로 본 게시 시각을 구독하는 훅. 목록을 열어 기록이 바뀌면 열린 헤더 버튼도 함께 갱신된다.
 *
 * @returns ISO 문자열 또는 null(서버 렌더링이거나 기록 없음)
 */
export function useNoticeLastSeenAt(): string | null {
  return useSyncExternalStore(subscribe, readNoticeLastSeenAt, () => null);
}
