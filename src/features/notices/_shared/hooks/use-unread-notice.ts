'use client';

import { useGetNotices } from '@/api/generated/endpoints/notice-controller/notice-controller';

import {
  hasUnreadNotice,
  useNoticeReadIds,
} from '../utils/notice-read-storage';

/**
 * 헤더 공지 버튼과 마이 메뉴 배지의 안 읽은 공지 여부를 구하는 훅.
 *
 * 목록 첫 페이지(서버 기본 20건)를 받아 게시 30일 안인데 읽은 기록이 없는 공지가 있는지 본다.
 * 공지 목록 화면의 무한 쿼리와 키가 달라 캐시를 공유하지 않지만, 요청은 세션당 한 번 수준이다.
 *
 * @returns 안 읽은 공지가 있으면 true. 조회 전이나 실패는 false
 */
export function useUnreadNotice(): boolean {
  const readIds = useNoticeReadIds();
  const { data } = useGetNotices();
  const notices = data?.status === 200 ? (data.data.items ?? []) : [];

  return hasUnreadNotice(notices, readIds);
}
