import { APP_PATH } from '@/constants/app-path';
import {
  NOTICE_COPY,
  NOTICE_READ_STORAGE_KEY,
} from '@/features/notices/_shared/constants';

import {
  expect,
  mockMemberSession,
  mockNoticeDetail,
  mockNotices,
  NOTICE_DETAIL_FIXTURE,
  NOTICES_FIXTURE,
  test,
} from '../fixtures/test';

test.describe('공지사항 (/notices)', () => {
  // 안 읽음 판정은 "게시 30일 안"을 기기 시각으로 재므로 픽스처 게시일 기준으로 시각을 고정한다.
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-24T12:00:00Z'));
  });

  test('게스트 홈 헤더는 로그인 버튼 오른쪽에 공지 버튼을 두고, 안 본 공지가 있으면 새 공지 이름과 빨간 점을 보인다', async ({
    page,
  }) => {
    await mockNotices(page);
    await page.goto(APP_PATH.MAIN.STORIES);

    const header = page.getByRole('banner');
    const loginButton = header.getByRole('link', { name: '로그인' });
    const noticeButton = header.getByRole('link', {
      name: NOTICE_COPY.unreadButtonLabel,
    });

    await expect(loginButton).toBeVisible();
    await expect(noticeButton).toBeVisible();
    await expect(page.getByTestId('notice-unread-dot')).toBeVisible();

    const [loginBox, noticeBox] = await Promise.all([
      loginButton.boundingBox(),
      noticeButton.boundingBox(),
    ]);

    expect(noticeBox!.x).toBeGreaterThan(loginBox!.x + loginBox!.width);
  });

  test('회원의 채팅, 제작 헤더에도 공지 버튼이 있고 로그인 버튼은 없다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockNotices(page);

    for (const path of [APP_PATH.MAIN.CHATS, APP_PATH.MAIN.STUDIO]) {
      await page.goto(path);

      const header = page.getByRole('banner');

      await expect(
        header.getByRole('link', { name: NOTICE_COPY.unreadButtonLabel }),
      ).toBeVisible();
      await expect(header.getByRole('link', { name: '로그인' })).toBeHidden();
    }

    await page.goto(APP_PATH.MAIN.MY);
    await expect(
      page.getByRole('banner').getByRole('link', { name: /공지사항/ }),
    ).toBeHidden();
  });

  test('마이 알림 섹션의 공지사항 메뉴는 안 읽은 공지가 있으면 새 공지 배지를 달고, 목록만 봐서는 배지가 남는다', async ({
    page,
  }) => {
    await mockNotices(page);
    await page.goto(APP_PATH.MAIN.MY);

    const menu = page.getByRole('link', { name: NOTICE_COPY.title });

    await expect(menu).toBeVisible();
    await expect(menu).toContainText(NOTICE_COPY.newBadge);

    await menu.click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTICES}$`));

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.MY}$`));
    await expect(
      page.getByRole('link', { name: NOTICE_COPY.title }),
    ).toContainText(NOTICE_COPY.newBadge);
  });

  test('공지 버튼으로 목록에 들어가면 안 읽은 공지에 점이 붙고, 상세를 열어야 그 줄의 점이 사라진다', async ({
    page,
  }) => {
    await mockNotices(page);
    await mockNoticeDetail(page);
    await page.goto(APP_PATH.MAIN.STORIES);
    await page
      .getByRole('banner')
      .getByRole('link', { name: NOTICE_COPY.unreadButtonLabel })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTICES}$`));
    await expect(
      page.getByRole('banner').getByText(NOTICE_COPY.title),
    ).toBeVisible();

    const rows = page.getByRole('main').getByRole('link');

    await expect(rows).toHaveCount(NOTICES_FIXTURE.length);
    await expect(rows.first()).toContainText(NOTICES_FIXTURE[0].title);
    await expect(rows.first()).toContainText('2026-10-24');
    await expect(rows.first()).toContainText(NOTICE_COPY.newBadge);
    await expect(rows.nth(1)).toContainText(NOTICE_COPY.newBadge);

    await rows.first().click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.NOTICE_DETAIL(NOTICES_FIXTURE[0].noticeId)}$`),
    );
    await expect
      .poll(() =>
        page.evaluate(
          (key) => window.localStorage.getItem(key),
          NOTICE_READ_STORAGE_KEY,
        ),
      )
      .toBe(JSON.stringify([NOTICES_FIXTURE[0].noticeId]));

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTICES}$`));
    await expect(rows.first()).not.toContainText(NOTICE_COPY.newBadge);
    await expect(rows.nth(1)).toContainText(NOTICE_COPY.newBadge);

    // 아직 안 읽은 공지가 남아 있어 헤더 점은 유지된다.
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('notice-unread-dot')).toBeVisible();
  });

  test('읽은 공지와 게시 30일이 지난 공지에는 점을 붙이지 않고, 모두 읽으면 헤더 점도 사라진다', async ({
    page,
  }) => {
    const oldNotice = {
      noticeId: 'old-notice',
      title: '오래전 공지',
      publishedAt: '2026-09-01T00:00:00Z',
    };

    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [
        NOTICE_READ_STORAGE_KEY,
        JSON.stringify([NOTICES_FIXTURE[0].noticeId]),
      ] as const,
    );
    await mockNotices(page, {
      first: { items: [...NOTICES_FIXTURE, oldNotice], nextCursor: null },
    });
    await mockNoticeDetail(page, {
      ...NOTICE_DETAIL_FIXTURE,
      noticeId: NOTICES_FIXTURE[1].noticeId,
    });
    await page.goto(APP_PATH.NOTICES);

    const rows = page.getByRole('main').getByRole('link');

    await expect(rows).toHaveCount(3);
    await expect(rows.first()).not.toContainText(NOTICE_COPY.newBadge);
    await expect(rows.nth(1)).toContainText(NOTICE_COPY.newBadge);
    await expect(rows.nth(2)).not.toContainText(NOTICE_COPY.newBadge);

    await rows.nth(1).click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.NOTICE_DETAIL(NOTICES_FIXTURE[1].noticeId)}$`),
    );
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page
        .getByRole('banner')
        .getByRole('link', { name: NOTICE_COPY.buttonLabel }),
    ).toBeVisible();
    await expect(page.getByTestId('notice-unread-dot')).toBeHidden();
  });

  test('목록 끝에 닿으면 받은 nextCursor로 다음 페이지를 이어 붙인다', async ({
    page,
  }) => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({
      noticeId: `first-${index}`,
      title: `첫 페이지 공지 ${index + 1}`,
      publishedAt: `2026-10-${String(20 - index).padStart(2, '0')}T00:00:00Z`,
    }));
    const secondPage = [
      {
        noticeId: 'second-0',
        title: '두 번째 페이지 공지',
        publishedAt: '2026-09-01T00:00:00Z',
      },
    ];

    await mockNotices(page, {
      first: { items: firstPage, nextCursor: 'cursor-2' },
      'cursor-2': { items: secondPage, nextCursor: null },
    });

    const nextRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/api/v1/notices') &&
        request.url().includes('cursor=cursor-2'),
    );

    await page.goto(APP_PATH.NOTICES);

    const rows = page.getByRole('main').getByRole('link');

    await rows.last().scrollIntoViewIfNeeded();
    await nextRequest;

    await expect(rows).toHaveCount(firstPage.length + secondPage.length);
    await expect(rows.last()).toContainText(secondPage[0].title);
  });

  test('공지가 없으면 빈 안내를, 조회에 실패하면 다시 시도하기를 보인다', async ({
    page,
  }) => {
    await mockNotices(page, { first: { items: [], nextCursor: null } });
    await page.goto(APP_PATH.NOTICES);

    await expect(page.getByText(NOTICE_COPY.empty)).toBeVisible();
    await expect(page.getByTestId('notice-unread-dot')).toBeHidden();

    await mockNotices(page, undefined, 500);
    await page.goto(APP_PATH.NOTICES);

    await expect(page.getByText(NOTICE_COPY.loadFailed)).toBeVisible();

    await mockNotices(page);
    await page.getByRole('button', { name: NOTICE_COPY.retry }).click();

    await expect(page.getByRole('main').getByRole('link')).toHaveCount(
      NOTICES_FIXTURE.length,
    );
  });

  test('상세는 제목, 게시일과 줄바꿈을 살린 본문을 보인다', async ({
    page,
  }) => {
    await mockNotices(page);
    await mockNoticeDetail(page);
    await page.goto(APP_PATH.NOTICES);
    await page.getByRole('link', { name: NOTICES_FIXTURE[0].title }).click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.NOTICE_DETAIL(NOTICES_FIXTURE[0].noticeId)}$`),
    );
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: NOTICE_DETAIL_FIXTURE.title,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(`${NOTICE_COPY.publishedAt} 2026-10-24`),
    ).toBeVisible();
    await expect(page.getByText(NOTICE_COPY.updatedAt)).toBeHidden();

    const body = page.getByRole('article').getByRole('paragraph').last();

    await expect(body).toHaveText(NOTICE_DETAIL_FIXTURE.body);
    await expect(body).toHaveCSS('white-space', 'pre-wrap');
  });

  test('주소로 바로 연 상세는 뒤로가기로 목록에 가고, 없는 공지는 안내와 목록 링크를 보인다', async ({
    page,
  }) => {
    await mockNotices(page);
    await mockNoticeDetail(page, {
      ...NOTICE_DETAIL_FIXTURE,
      updatedAt: '2026-10-25T01:00:00Z',
    });
    await page.goto(APP_PATH.NOTICE_DETAIL(NOTICES_FIXTURE[0].noticeId));

    await expect(
      page.getByText(`${NOTICE_COPY.updatedAt} 2026-10-25`),
    ).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTICES}$`));

    await mockNoticeDetail(page, undefined, 404);
    await page.goto(APP_PATH.NOTICE_DETAIL('missing-notice'));

    await expect(page.getByText(NOTICE_COPY.notFound)).toBeVisible();
    await page.getByRole('link', { name: NOTICE_COPY.backToList }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.NOTICES}$`));
  });
});
