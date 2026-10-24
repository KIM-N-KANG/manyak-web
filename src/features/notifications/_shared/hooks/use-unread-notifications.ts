'use client';

import { useUnreadCount } from '@/api/generated/endpoints/notifications/notifications';
import type { NotificationUnreadCount } from '@/api/generated/models';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';

const EMPTY: Required<NotificationUnreadCount> = {
  total: 0,
  news: 0,
  activity: 0,
};

/**
 * 회원의 분류별 안 읽은 알림 수를 구하는 훅. 헤더 종 버튼의 점과 알림함 탭의 점이 함께 쓴다.
 * 회원이 아니거나 조회 전·실패면 전부 0이다.
 *
 * @returns 전체·소식·활동 안 읽은 수
 */
export function useUnreadNotifications(): Required<NotificationUnreadCount> {
  const { isMember } = useMemberAccess();
  const { data } = useUnreadCount({ query: { enabled: isMember } });

  if (!isMember || data?.status !== 200) return EMPTY;

  return {
    total: data.data.total ?? 0,
    news: data.data.news ?? 0,
    activity: data.data.activity ?? 0,
  };
}
