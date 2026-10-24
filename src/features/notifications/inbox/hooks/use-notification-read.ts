'use client';

import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetUsersMeNotificationsQueryKey,
  getUnreadCountQueryKey,
  useRead,
  useReadAll,
} from '@/api/generated/endpoints/notifications/notifications';
import type {
  NotificationItem,
  NotificationPage,
} from '@/api/generated/models';

import { NOTIFICATION_COPY } from '../../_shared/constants';

/** 무한 목록 캐시 한 페이지. 생성 함수 응답 형태(`status`·`data`)를 그대로 쌓는다. */
type NotificationPageResult = { status: number; data: NotificationPage };

/**
 * 알림 읽음 처리 훅. 한 건 읽음과 모두 읽음을 제공한다.
 *
 * 둘 다 먼저 캐시의 `readAt`을 채워 카드와 점을 즉시 꺼 두고(낙관적 갱신), 요청이 끝나면 안 읽은 수를 다시 읽는다.
 * 한 건 읽음은 이동과 함께 일어나 실패해도 조용히 넘기고, 모두 읽음은 실패하면 캐시를 되돌리고 토스트로 알린다.
 *
 * @returns 읽음 처리 함수와 모두 읽음 진행 상태
 */
export function useNotificationRead() {
  const queryClient = useQueryClient();
  const listKey = getGetUsersMeNotificationsQueryKey();
  const unreadKey = getUnreadCountQueryKey();

  const markCached = (
    predicate: (item: NotificationItem) => boolean,
    readAt: string,
  ) => {
    queryClient.setQueriesData<InfiniteData<NotificationPageResult>>(
      { queryKey: listKey },
      (cached) =>
        cached && {
          ...cached,
          pages: cached.pages.map((page) =>
            page.status === 200
              ? {
                  ...page,
                  data: {
                    ...page.data,
                    items: page.data.items?.map((item) =>
                      !item.readAt && predicate(item)
                        ? { ...item, readAt }
                        : item,
                    ),
                  },
                }
              : page,
          ),
        },
    );
  };

  const refreshUnread = () =>
    queryClient.invalidateQueries({ queryKey: unreadKey });

  const readOne = useRead({
    mutation: {
      onMutate: ({ notificationId }) => {
        markCached(
          (item) => item.notificationId === notificationId,
          new Date().toISOString(),
        );
      },
      onSettled: refreshUnread,
    },
  });

  const readAll = useReadAll({
    mutation: {
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: listKey });

        const snapshot = queryClient.getQueriesData<
          InfiniteData<NotificationPageResult>
        >({ queryKey: listKey });

        markCached(() => true, new Date().toISOString());

        return { snapshot };
      },
      onError: (_error, _variables, context) => {
        context?.snapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
        toast.error(NOTIFICATION_COPY.readAllFailed);
      },
      onSettled: refreshUnread,
    },
  });

  return {
    /** 한 건을 읽음으로 표시한다. 이미 읽은 항목이면 요청하지 않는다. */
    markRead: (item: NotificationItem) => {
      if (!item.notificationId || item.readAt) return;

      readOne.mutate({ notificationId: item.notificationId });
    },
    /** 모든 알림을 읽음으로 표시한다. */
    markAllRead: () => readAll.mutate({}),
    isMarkingAllRead: readAll.isPending,
  };
}
