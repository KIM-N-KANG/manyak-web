'use client';

import { useGetNotices } from '@/api/generated/endpoints/notice-controller/notice-controller';

import {
  isNoticeUnread,
  useNoticeLastSeenAt,
} from '../utils/notice-seen-storage';

/**
 * 헤더 공지 버튼의 새 공지 여부를 구하는 훅.
 *
 * 목록 첫 페이지를 1건만 받아 가장 최신 공지의 게시 시각을 마지막으로 본 시각과 비교한다.
 * 공지 목록 화면의 첫 페이지와 키가 달라 캐시를 공유하지 않지만, 요청은 세션당 한 번 수준이다.
 *
 * @returns 새 공지가 있으면 true. 조회 전이나 실패는 false
 */
export function useUnreadNotice(): boolean {
  const lastSeenAt = useNoticeLastSeenAt();
  const { data } = useGetNotices({ limit: 1 });
  const latest = data?.status === 200 ? data.data.items?.[0] : undefined;

  return isNoticeUnread(latest?.publishedAt, lastSeenAt);
}
