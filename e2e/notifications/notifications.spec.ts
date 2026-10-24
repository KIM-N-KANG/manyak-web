import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { NOTICE_COPY } from '@/features/notices/_shared/constants';
import {
  NOTIFICATION_COPY,
  NOTIFICATION_TYPE_LABEL,
} from '@/features/notifications/_shared/constants';

import {
  expect,
  mockMemberSession,
  mockNoticeDetail,
  mockNotices,
  mockNotificationReads,
  mockNotifications,
  mockNotificationUnreadCount,
  NOTIFICATIONS_FIXTURE,
  test,
} from '../fixtures/test';

const backButton = (page: Page) =>
  page.getByRole('button', { name: '이전 페이지로 돌아가기 버튼' });

/** 회원 세션과 알림함 API(목록·안 읽은 수·읽음)를 한 번에 목킹하고 읽음 요청 기록을 돌려준다. */
async function mockInbox(page: Page) {
  await mockMemberSession(page);
  await mockNotifications(page);

  const readCalls = await mockNotificationReads(page);

  await mockNotificationUnreadCount(page, undefined, readCalls);

  return readCalls;
}

test.describe('알림함 (/notifications)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-24T12:00:00Z'));
  });

  test('게스트는 로그인으로 이동하고, 게스트 헤더 종 버튼은 공지사항으로 간다', async ({
    page,
  }) => {
    await mockNotices(page);
    await page.goto(APP_PATH.NOTIFICATIONS);
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}$`));

    await page.goto(APP_PATH.MAIN.STORIES);
    await expect(
      page
        .getByRole('banner')
        .getByRole('link', { name: NOTICE_COPY.unreadButtonLabel }),
    ).toHaveAttribute('href', APP_PATH.NOTICES);
  });

  test('회원 헤더 종 버튼은 안 읽은 알림이 있으면 점을 찍고 알림함으로 간다 (소식 탭이 먼저 열린다)', async ({
    page,
  }) => {
    await mockInbox(page);
    await page.goto(APP_PATH.MAIN.STORIES);

    const header = page.getByRole('banner');
    const button = header.getByRole('link', {
      name: NOTIFICATION_COPY.unreadButtonLabel,
    });

    await expect(button).toBeVisible();
    await expect(page.getByTestId('notification-unread-dot')).toBeVisible();
    await expect(header.getByRole('link', { name: '로그인' })).toBeHidden();

    await button.click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTIFICATIONS}$`));
    await expect(
      page.getByRole('banner').getByText(NOTIFICATION_COPY.title),
    ).toBeVisible();

    const newsTab = page.getByRole('tab', {
      name: new RegExp(NOTIFICATION_COPY.newsTab),
    });
    const activityTab = page.getByRole('tab', {
      name: new RegExp(NOTIFICATION_COPY.activityTab),
    });

    await expect(newsTab).toHaveAttribute('aria-selected', 'true');
    // 두 분류 모두 안 읽은 알림이 있어 탭 라벨 옆에 점이 있다.
    await expect(newsTab).toContainText(NOTIFICATION_COPY.unreadTab);
    await expect(activityTab).toContainText(NOTIFICATION_COPY.unreadTab);

    const cards = page.getByRole('main').getByRole('link');
    const [unreadNotice, readPromotion] = NOTIFICATIONS_FIXTURE.NEWS;

    await expect(cards).toHaveCount(NOTIFICATIONS_FIXTURE.NEWS.length);
    await expect(cards.first()).toContainText(unreadNotice.title);
    await expect(cards.first()).toContainText(unreadNotice.body);
    // 공지 알림은 공지 태그 라벨("업데이트")을, 이벤트 알림은 유형 라벨을 분류로 쓴다.
    await expect(cards.first()).toContainText('업데이트');
    await expect(cards.first()).toContainText(NOTIFICATION_COPY.unreadCard);
    await expect(cards.nth(1)).toContainText(readPromotion.title);
    await expect(cards.nth(1)).toContainText(NOTIFICATION_TYPE_LABEL.PROMOTION);
    await expect(cards.nth(1)).not.toContainText(NOTIFICATION_COPY.unreadCard);
  });

  test('카드를 탭하면 읽음을 기록하고 알림이 가리키는 화면으로 간다', async ({
    page,
  }) => {
    const readCalls = await mockInbox(page);

    await mockNoticeDetail(page);
    await page.goto(APP_PATH.NOTIFICATIONS);

    const [unreadNotice] = NOTIFICATIONS_FIXTURE.NEWS;
    const card = page
      .getByRole('main')
      .getByRole('link', { name: new RegExp(unreadNotice.title) });

    await card.click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.NOTICE_DETAIL(unreadNotice.noticeId)}$`),
    );
    expect(readCalls).toEqual([
      `/api/v1/users/me/notifications/${unreadNotice.notificationId}/read`,
    ]);

    // 돌아오면 그 카드의 점이 꺼지고, 소식에 남은 안 읽은 알림이 없어 탭의 점도 꺼진다.
    await backButton(page).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTIFICATIONS}$`));
    await expect(card).not.toContainText(NOTIFICATION_COPY.unreadCard);
    await expect(
      page.getByRole('tab', { name: new RegExp(NOTIFICATION_COPY.newsTab) }),
    ).not.toContainText(NOTIFICATION_COPY.unreadTab);
  });

  test('활동 탭은 완성·검토 알림을 보이고, 모두 읽음은 두 탭의 점과 헤더 점을 끈다', async ({
    page,
  }) => {
    const readCalls = await mockInbox(page);

    await page.goto(APP_PATH.NOTIFICATIONS);
    await page
      .getByRole('tab', { name: new RegExp(NOTIFICATION_COPY.activityTab) })
      .click();

    const cards = page.getByRole('main').getByRole('link');
    const [completed, moderated] = NOTIFICATIONS_FIXTURE.ACTIVITY;

    await expect(cards).toHaveCount(NOTIFICATIONS_FIXTURE.ACTIVITY.length);
    await expect(cards.first()).toContainText(
      NOTIFICATION_TYPE_LABEL.STORY_COMPLETED,
    );
    await expect(cards.first()).toContainText(completed.body);
    await expect(cards.first()).toContainText(NOTIFICATION_COPY.unreadCard);
    await expect(cards.nth(1)).toContainText(
      NOTIFICATION_TYPE_LABEL.STORY_MODERATION_COMPLETED,
    );
    await expect(cards.nth(1)).toContainText(moderated.title);

    const readAll = page
      .getByRole('banner')
      .getByRole('button', { name: NOTIFICATION_COPY.readAll });

    await expect(readAll).toBeEnabled();
    await readAll.click();

    expect(readCalls).toEqual(['/api/v1/users/me/notifications/read-all']);
    await expect(cards.first()).not.toContainText(NOTIFICATION_COPY.unreadCard);
    await expect(page.getByRole('tab')).not.toContainText([
      NOTIFICATION_COPY.unreadTab,
      NOTIFICATION_COPY.unreadTab,
    ]);
    // 안 읽은 알림이 없으면 모두 읽음은 비활성이다.
    await expect(readAll).toBeDisabled();

    await backButton(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('notification-unread-dot')).toBeHidden();
    await expect(
      page
        .getByRole('banner')
        .getByRole('link', { name: NOTIFICATION_COPY.buttonLabel }),
    ).toBeVisible();
  });

  test('목록 끝에 닿으면 받은 nextCursor로 다음 페이지를 이어 붙인다', async ({
    page,
  }) => {
    await mockMemberSession(page);

    const readCalls = await mockNotificationReads(page);

    await mockNotificationUnreadCount(page, undefined, readCalls);

    const [first] = NOTIFICATIONS_FIXTURE.NEWS;
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      ...first,
      notificationId: `aaaaaaaa-0000-4000-8000-${String(index).padStart(12, '0')}`,
      title: `소식 ${index + 1}`,
      readAt: '2026-10-20T10:00:00Z',
    }));
    const secondPage = [
      {
        ...first,
        notificationId: 'aaaaaaaa-9999-4999-8999-999999999999',
        title: '소식 21',
      },
    ];

    await mockNotifications(page, {
      NEWS: {
        first: { items: firstPage, nextCursor: 'cursor-2' },
        'cursor-2': { items: secondPage, nextCursor: null },
      },
    });
    await page.goto(APP_PATH.NOTIFICATIONS);

    const cards = page.getByRole('main').getByRole('link');

    await expect(cards).toHaveCount(20);
    await cards.last().scrollIntoViewIfNeeded();
    await expect(cards).toHaveCount(21);
    await expect(cards.last()).toContainText('소식 21');
  });

  test('알림이 없으면 분류별 빈 안내를, 조회에 실패하면 다시 시도하기를 보인다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockNotificationUnreadCount(page, {
      total: 0,
      news: 0,
      activity: 0,
    });
    await mockNotifications(page, {});
    await page.goto(APP_PATH.NOTIFICATIONS);

    await expect(page.getByText(NOTIFICATION_COPY.emptyNews)).toBeVisible();
    await expect(
      page
        .getByRole('banner')
        .getByRole('button', { name: NOTIFICATION_COPY.readAll }),
    ).toBeDisabled();

    await page
      .getByRole('tab', { name: new RegExp(NOTIFICATION_COPY.activityTab) })
      .click();
    await expect(page.getByText(NOTIFICATION_COPY.emptyActivity)).toBeVisible();

    await mockNotifications(page, {}, 500);
    await page.goto(APP_PATH.NOTIFICATIONS);
    await expect(page.getByText(NOTIFICATION_COPY.loadFailed)).toBeVisible();

    await mockNotifications(page);
    await page.getByRole('button', { name: NOTIFICATION_COPY.retry }).click();
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(
      NOTIFICATIONS_FIXTURE.NEWS.length,
    );
  });
});
