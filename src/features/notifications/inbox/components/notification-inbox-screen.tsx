'use client';

import { useEffect, useState } from 'react';

import { Settings02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { BackHeader } from '@/components/layout/back-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_PATH } from '@/constants/app-path';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { cn } from '@/lib/utils';

import { NOTIFICATION_COPY } from '../../_shared/constants';
import { useUnreadNotifications } from '../../_shared/hooks/use-unread-notifications';
import { useNotificationRead } from '../hooks/use-notification-read';
import { NotificationList } from './notification-list';

const NEWS_TAB = 'NEWS';
const ACTIVITY_TAB = 'ACTIVITY';

/** 탭 패널이 스크롤러라 기본 text-sm이 카드 본문 크기를 줄인다. 되돌려 둔다. */
const TAB_PANEL_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden text-base';

/**
 * 알림함. 뒤로가기 헤더(오른쪽에 간편 제작 헤더와 같은 보조 버튼 "모두 읽음"과 알림 설정 톱니 버튼)와
 * 소식·활동 탭 줄은 셸에 고정하고 탭 패널만 스크롤한다.
 * 탭은 URL에 남기지 않고 화면 상태로만 둔다 — 진입점은 헤더 종 버튼 하나뿐이고 탭을 공유할 일이 없다.
 * 회원 전용이라 게스트는 로그인으로 보낸다.
 */
export function NotificationInboxScreen() {
  const router = useRouter();
  const { status } = useSession();
  const { isMember } = useMemberAccess();
  const unread = useUnreadNotifications();
  const { markRead, markAllRead, isMarkingAllRead } = useNotificationRead();
  const [activeTab, setActiveTab] = useState<string>(NEWS_TAB);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [status, router]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={NOTIFICATION_COPY.title}
        fallbackHref={APP_PATH.MAIN.STORIES}
        action={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              disabled={!isMember || unread.total === 0 || isMarkingAllRead}
              onClick={markAllRead}>
              {NOTIFICATION_COPY.readAll}
            </Button>
            <Link
              href={APP_PATH.MY_NOTIFICATIONS}
              aria-label={NOTIFICATION_COPY.settingsButtonLabel}
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
              <HugeiconsIcon icon={Settings02Icon} aria-hidden="true" />
            </Link>
          </div>
        }
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="w-full gap-0 border-b p-0">
            <InboxTabTrigger
              value={NEWS_TAB}
              label={NOTIFICATION_COPY.newsTab}
              hasUnread={unread.news > 0}
            />
            <InboxTabTrigger
              value={ACTIVITY_TAB}
              label={NOTIFICATION_COPY.activityTab}
              hasUnread={unread.activity > 0}
            />
          </TabsList>

          <TabsContent value={NEWS_TAB} className={TAB_PANEL_CLASS}>
            <NotificationList
              category={NEWS_TAB}
              enabled={isMember}
              onRead={markRead}
            />
          </TabsContent>
          <TabsContent value={ACTIVITY_TAB} className={TAB_PANEL_CLASS}>
            <NotificationList
              category={ACTIVITY_TAB}
              enabled={isMember}
              onRead={markRead}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

type InboxTabTriggerProps = {
  value: string;
  label: string;
  hasUnread: boolean;
};

/** 이프 충전과 같은 라인 탭. 그 분류에 안 읽은 알림이 있으면 라벨 오른쪽 위에 작은 빨간 점을 둔다. */
function InboxTabTrigger({ value, label, hasUnread }: InboxTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'h-full rounded-none border-0 px-2 py-0 after:-bottom-px!',
      )}>
      <span className="relative">
        {label}
        {hasUnread ? (
          <span className="absolute -top-0.5 -right-2 size-1.5 rounded-full bg-destructive">
            <span className="sr-only">{NOTIFICATION_COPY.unreadTab}</span>
          </span>
        ) : null}
      </span>
    </TabsTrigger>
  );
}
