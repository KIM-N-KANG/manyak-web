import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LOGIN_REQUIRED_SHEET_COPY } from '@/features/auth/_shared/constants/login-required';
import { SOCIAL_LOGIN_PENDING_LABEL } from '@/features/auth/_shared/hooks/use-social-login';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';

import {
  expect,
  mockMemberSession,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

const DETAIL = '**/api/v1/stories/s1';
const LIKE = '**/api/v1/stories/s1/like';
const story = {
  id: 's1',
  title: '용의 계곡',
  turnCount: 25,
  likeCount: 1234,
  isLiked: false,
  isOwner: false,
};

const countText = (count: number) =>
  `${STORY_LIKE_COPY.count} ${count.toLocaleString('en-US')}`;

test('등록·취소·재진입과 목록 복귀에 좋아요 상태와 수를 반영한다', async ({
  page,
}) => {
  await mockMemberSession(page);
  await skipOnboarding(page);

  let current = { ...story };
  const methods: string[] = [];

  await page.route(DETAIL, (route) => route.fulfill({ json: current }));
  await page.route('**/api/v1/stories/originals', (route) =>
    route.fulfill({ json: [current] }),
  );
  await page.route(LIKE, async (route) => {
    const method = route.request().method();

    methods.push(method);
    current = {
      ...current,
      isLiked: method === 'POST',
      likeCount: current.likeCount + (method === 'POST' ? 1 : -1),
    };
    await route.fulfill({ status: 204 });
  });

  await page.goto(APP_PATH.MAIN.STORIES);
  await expect(page.getByText(countText(1234), { exact: true })).toBeVisible();
  await page.getByRole('link', { name: `${story.title} 상세 보기` }).click();

  const like = page.getByRole('button', {
    name: STORY_LIKE_COPY.like,
    exact: true,
  });

  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(like).toHaveCSS('width', '48px');
  await expect(like.locator('..')).toHaveCSS('column-gap', '4px');
  await like.click();
  await expect(
    page.getByRole('button', { name: STORY_LIKE_COPY.unlike }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(countText(1235), { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText(countText(1235), { exact: true })).toBeVisible();
  await page.getByRole('link', { name: `${story.title} 상세 보기` }).click();
  await page.getByRole('button', { name: STORY_LIKE_COPY.unlike }).click();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(countText(1234), { exact: true })).toBeVisible();
  expect(methods).toEqual(['POST', 'DELETE']);
});

for (const isLiked of [false, true]) {
  test(`요청 중 중복 클릭을 막고 실패하면 기존 상태를 유지한다 (${isLiked})`, async ({
    page,
  }) => {
    await mockMemberSession(page);
    await page.route(DETAIL, (route) =>
      route.fulfill({ json: { ...story, isLiked } }),
    );

    let requests = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route(LIKE, async (route) => {
      requests += 1;
      await gate;
      await route.fulfill({ status: 500, json: {} });
    });
    await page.goto(APP_PATH.STORY_DETAIL('s1'));

    const button = page.getByRole('button', {
      name: isLiked ? STORY_LIKE_COPY.unlike : STORY_LIKE_COPY.like,
      exact: true,
    });

    await button.click();
    await expect(button).toBeDisabled();
    await button.evaluate((element: HTMLButtonElement) => element.click());
    release();
    await expect(page.getByText(TOAST_MESSAGE.STORY_LIKE_FAILED)).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(button).toHaveAttribute('aria-pressed', String(isLiked));
    await expect(
      page.getByText(countText(1234), { exact: true }),
    ).toBeVisible();
    expect(requests).toBe(1);
  });
}

for (const member of [false, true]) {
  test(`내가 만든 스토리는 좋아요 버튼을 숨기고 수는 표시한다 (${member ? '회원' : '게스트'})`, async ({
    page,
  }) => {
    if (member) await mockMemberSession(page);
    else await seedStoryIds(page, ['s1']);

    await page.route(DETAIL, (route) =>
      route.fulfill({ json: { ...story, isOwner: member } }),
    );
    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await expect(
      page.getByRole('heading', { name: story.title, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: STORY_LIKE_COPY.like, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(countText(1234), { exact: true }),
    ).toBeVisible();
  });
}

test('게스트는 좋아요 요청 없이 로그인 시트를 열고 닫아도 상세에 머문다', async ({
  page,
}) => {
  let requests = 0;

  await page.route(DETAIL, (route) => route.fulfill({ json: story }));
  await page.route(LIKE, async (route) => {
    requests += 1;
    await route.fulfill({ status: 204 });
  });
  await page.goto(APP_PATH.STORY_DETAIL('s1'));
  await page
    .getByRole('button', { name: STORY_LIKE_COPY.like, exact: true })
    .click();

  const sheet = page.getByRole('dialog', {
    name: LOGIN_REQUIRED_SHEET_COPY.title,
  });

  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByText(LOGIN_REQUIRED_SHEET_COPY.description),
  ).toBeVisible();
  await expect(
    sheet.getByRole('button', { name: '카카오로 시작하기' }),
  ).toBeVisible();
  await expect(
    sheet.getByRole('button', { name: 'Google로 시작하기' }),
  ).toBeVisible();
  await expect(page).toHaveURL(APP_PATH.STORY_DETAIL('s1'));
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await page
    .getByRole('button', { name: STORY_LIKE_COPY.like, exact: true })
    .click();
  await expect(sheet).toBeVisible();
  await expect(page).toHaveURL(APP_PATH.STORY_DETAIL('s1'));
  expect(requests).toBe(0);
});

test('좋아요 수가 누락된 응답은 0으로 표시한다', async ({ page }) => {
  await page.route(DETAIL, (route) =>
    route.fulfill({ json: { id: story.id, title: story.title } }),
  );
  await page.goto(APP_PATH.STORY_DETAIL('s1'));
  await expect(page.getByText(countText(0), { exact: true })).toBeVisible();
});

for (const provider of ['kakao', 'google'] as const) {
  test(`좋아요 로그인 시트의 ${provider} 로그인은 상세 복귀 경로를 전달하고 실패 시 재시도할 수 있다`, async ({
    page,
  }) => {
    await page.route(DETAIL, (route) => route.fulfill({ json: story }));
    await page.route('**/api/auth/providers', (route) =>
      route.fulfill({
        json: {
          [provider]: {
            id: provider,
            name: provider,
            type: 'oauth',
            signinUrl: `/api/auth/signin/${provider}`,
            callbackUrl: `/api/auth/callback/${provider}`,
          },
        },
      }),
    );
    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({ json: { csrfToken: 'test-csrf' } }),
    );

    let callbackUrl: string | null = null;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route(`**/api/auth/signin/${provider}*`, async (route) => {
      callbackUrl = new URLSearchParams(route.request().postData() ?? '').get(
        'callbackUrl',
      );
      await gate;
      await route.abort();
    });
    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await page
      .getByRole('button', { name: STORY_LIKE_COPY.like, exact: true })
      .click();

    const sheet = page.getByRole('dialog', {
      name: LOGIN_REQUIRED_SHEET_COPY.title,
    });

    await sheet
      .getByRole('button', {
        name: provider === 'kakao' ? '카카오로 시작하기' : 'Google로 시작하기',
      })
      .click();
    await expect(sheet.getByLabel(SOCIAL_LOGIN_PENDING_LABEL)).toBeVisible();

    for (const button of await sheet.getByRole('button').all())
      await expect(button).toBeDisabled();

    await expect.poll(() => callbackUrl).toBe(APP_PATH.STORY_DETAIL('s1'));
    await page.keyboard.press('Escape');
    await expect(sheet).toBeVisible();
    release();
    await expect(page.getByText(TOAST_MESSAGE.LOGIN_FAILED)).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: '카카오로 시작하기' }),
    ).toBeEnabled();
    await expect(
      sheet.getByRole('button', { name: 'Google로 시작하기' }),
    ).toBeEnabled();
    await expect(page).toHaveURL(APP_PATH.STORY_DETAIL('s1'));
  });
}
