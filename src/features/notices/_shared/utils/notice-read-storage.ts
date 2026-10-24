import { useSyncExternalStore } from 'react';

import type { PublicNoticeItemResponse } from '@/api/generated/models';

import {
  NOTICE_READ_IDS_LIMIT,
  NOTICE_READ_STORAGE_KEY,
  NOTICE_UNREAD_WINDOW_DAYS,
} from '../constants';

/**
 * 안 읽은 공지 판정의 기준이 되는 "읽은 공지 ID" 저장소다.
 *
 * 서버에 읽음 기록 API가 없어 기기 단위로 둔다. 공지 상세를 열면 그 ID를 기록하고, 게시된 지
 * 30일 안인데 기록에 없는 공지를 안 읽음으로 본다. 목록만 보는 것은 읽음이 아니다. 헤더 버튼의 점,
 * 마이 메뉴의 배지, 목록 줄 제목 끝의 점이 모두 이 판정을 쓴다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_IDS: readonly string[] = [];

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
 * 공지가 안 읽음인지 판정한다.
 *
 * @param notice 공지(ID와 게시 시각)
 * @param readIds 읽은 공지 ID 목록
 * @param now 판정 기준 시각(ms). 기본은 현재
 * @returns 게시 30일 안이고 읽은 적이 없으면 true. ID나 게시 시각이 없거나 깨졌으면 false
 */
export function isNoticeUnread(
  notice: Pick<PublicNoticeItemResponse, 'noticeId' | 'publishedAt'>,
  readIds: readonly string[],
  now: number = Date.now(),
): boolean {
  if (!notice.noticeId || !notice.publishedAt) return false;

  if (readIds.includes(notice.noticeId)) return false;

  const published = Date.parse(notice.publishedAt);

  if (Number.isNaN(published)) return false;

  return now - published <= NOTICE_UNREAD_WINDOW_DAYS * DAY_MS;
}

/**
 * 목록에 안 읽은 공지가 하나라도 있는지 판정한다.
 *
 * @param notices 공지 목록
 * @param readIds 읽은 공지 ID 목록
 * @param now 판정 기준 시각(ms)
 * @returns 안 읽은 공지가 있으면 true
 */
export function hasUnreadNotice(
  notices: readonly Pick<
    PublicNoticeItemResponse,
    'noticeId' | 'publishedAt'
  >[],
  readIds: readonly string[],
  now: number = Date.now(),
): boolean {
  return notices.some((notice) => isNoticeUnread(notice, readIds, now));
}

/**
 * 저장값을 읽은 ID 배열로 해석한다. 배열이 아니거나 문자열이 아닌 항목이 섞이면 빈 목록으로 본다.
 *
 * @param raw 저장소 원문(없으면 null)
 * @returns 읽은 공지 ID 배열
 */
export function parseNoticeReadIds(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed) &&
      parsed.every((id): id is string => typeof id === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}

/**
 * 읽은 ID 목록 앞에 새 ID를 넣는다. 이미 있으면 맨 앞으로 옮기고 상한을 넘기면 뒤를 자른다.
 *
 * @param readIds 기존 읽은 ID 목록
 * @param noticeId 새로 읽은 공지 ID
 * @returns 새 목록
 */
export function appendNoticeReadId(
  readIds: readonly string[],
  noticeId: string,
): string[] {
  return [noticeId, ...readIds.filter((id) => id !== noticeId)].slice(
    0,
    NOTICE_READ_IDS_LIMIT,
  );
}

let cachedRaw: string | null | undefined;
let cachedIds: readonly string[] = EMPTY_IDS;

/**
 * 읽은 공지 ID 목록을 읽는다. 서버 렌더링과 저장소 차단 환경에서는 빈 목록이다.
 * 원문이 같으면 같은 배열을 돌려줘 `useSyncExternalStore`가 다시 그리지 않게 한다.
 *
 * @returns 읽은 공지 ID 배열
 */
export function readNoticeReadIds(): readonly string[] {
  if (typeof window === 'undefined') return EMPTY_IDS;

  let raw: string | null;

  try {
    raw = window.localStorage.getItem(NOTICE_READ_STORAGE_KEY);
  } catch {
    return EMPTY_IDS;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseNoticeReadIds(raw);
  }

  return cachedIds;
}

/**
 * 공지를 읽은 것으로 기록한다. 상세 화면이 공지를 받으면 부른다.
 *
 * @param noticeId 읽은 공지 ID
 */
export function markNoticeRead(noticeId: string | undefined): void {
  if (!noticeId) return;

  const current = readNoticeReadIds();

  if (current[0] === noticeId) return;

  try {
    window.localStorage.setItem(
      NOTICE_READ_STORAGE_KEY,
      JSON.stringify(appendNoticeReadId(current, noticeId)),
    );
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }

  emit();
}

/**
 * 읽은 공지 ID 목록을 구독하는 훅. 상세를 열어 기록이 바뀌면 열린 목록 줄과 헤더 버튼이 함께 갱신된다.
 *
 * @returns 읽은 공지 ID 배열(서버 렌더링에서는 빈 목록)
 */
export function useNoticeReadIds(): readonly string[] {
  return useSyncExternalStore(subscribe, readNoticeReadIds, () => EMPTY_IDS);
}
