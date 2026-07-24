import type { Page } from '@playwright/test';

import {
  expect,
  mockHandoffCreate,
  mockHandoffSession,
  mockHandoffStatus,
  seedChatIds,
  seedPendingHandoff,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

/**
 * 인앱 게스트 허용·로그인 핸드오프 스펙(KNK-682, 스펙 §3-10).
 * 인앱 UA는 실제 SNS 인앱 브라우저를 시뮬레이션한다(Instagram UA → detectInAppBrowser).
 */
const INSTAGRAM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0';

const STORIES_BATCH = '**/api/v1/stories/batch';

const readLocalStorage = (page: Page, key: string) =>
  page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key);

test.describe('인앱 브라우저 게스트 허용·로그인 핸드오프', () => {
  test.use({ userAgent: INSTAGRAM_UA });

  test('인앱에서도 전면 차단 없이 스토리 목록을 이용한다', async ({ page }) => {
    await skipOnboarding(page);
    await seedStoryIds(page, ['s1']);
    await page.route(STORIES_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 's1',
            title: '용의 계곡',
            oneLineIntro: '한 줄 소개입니다',
            genres: ['판타지'],
            createdAt: '2026-06-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/');

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(
      page.getByText('외부 브라우저에서 로그인해주세요'),
    ).toBeHidden();
  });

  test('홈 헤더의 로그인 버튼은 /login을 거치지 않고 바로 전환 안내로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockHandoffCreate(page, {
      handoffCode: 'handoff-code-1',
      handoffId: 'handoff-id-1',
    });

    await page.goto('/');
    await page
      .getByRole('banner')
      .getByRole('link', { name: '로그인' })
      .click();

    await expect(page).toHaveURL(/\/login\/continue\?handoff=handoff-code-1/);
    await expect(
      page.getByText('외부 브라우저에서 로그인해주세요'),
    ).toBeVisible();
  });

  test('로그인하면 핸드오프를 만들고 전환 안내로 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockHandoffCreate(page, {
      handoffCode: 'handoff-code-1',
      handoffId: 'handoff-id-1',
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /Google로 시작하기/ }).click();

    await expect(page).toHaveURL(/\/login\/continue\?handoff=handoff-code-1/);
    await expect(
      page.getByText('외부 브라우저에서 로그인해주세요'),
    ).toBeVisible();
  });

  test('인앱 복귀 시 이관된 ID만 로컬에서 제거한다', async ({ page }) => {
    await skipOnboarding(page);
    await seedStoryIds(page, ['s1', 's2']);
    await seedChatIds(page, ['c1']);
    await seedPendingHandoff(page, {
      code: 'handoff-code-1',
      handoffId: 'handoff-id-1',
      storyIds: ['s1', 's2'],
      chatIds: ['c1'],
    });
    await mockHandoffStatus(page, {
      status: 'MIGRATED',
      migratedStoryIds: ['s1'],
      migratedChatIds: ['c1'],
    });

    await page.goto('/');

    await expect(
      page.getByText('스토리 1개, 채팅 1개를 계정으로 옮겼어요'),
    ).toBeVisible();
    // 이관된 s1·c1만 지우고, 핸드오프 이후에도 게스트 소유인 s2는 남긴다.
    await expect
      .poll(() => readLocalStorage(page, 'manyak:created-story-ids'))
      .toBe(JSON.stringify(['s2']));
    await expect(
      readLocalStorage(page, 'manyak:created-chat-ids'),
    ).resolves.toBe(JSON.stringify([]));
    await expect(
      readLocalStorage(page, 'manyak:pending-login-handoff'),
    ).resolves.toBeNull();
  });
});

test.describe('외부 브라우저 핸드오프 랜딩', () => {
  test('코드를 쿠키로 옮기고 쿼리를 제거한 뒤 이관 안내와 로그인 CTA를 보여준다', async ({
    page,
  }) => {
    await mockHandoffSession(page, {
      body: { storyCount: 1, chatCount: 1, callbackPath: '/' },
    });

    await page.goto('/login/continue?handoff=handoff-code-1');

    await expect(page).toHaveURL('/login/continue');
    await expect(page.getByText(/계정당 한 번만 진행돼요/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    // 로그인 페이지와 동일하게 약관 동의 고지를 상시 표시한다.
    await expect(
      page.getByRole('link', { name: '서비스이용약관' }),
    ).toBeVisible();
  });

  test('만료된 코드는 만료 안내를 보여준다', async ({ page }) => {
    await mockHandoffSession(page, { status: 404 });

    await page.goto('/login/continue?handoff=expired');

    await expect(page.getByText('링크가 만료됐어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '로그인하러 가기' }),
    ).toBeVisible();
  });

  test('핸드오프 수령 후에는 로그인 없이 홈에 진입해도 온보딩으로 튕기지 않는다', async ({
    page,
  }) => {
    await mockHandoffSession(page, {
      body: { storyCount: 0, chatCount: 0, callbackPath: '/' },
    });

    await page.goto('/login/continue?handoff=handoff-code-1');
    await expect(page).toHaveURL('/login/continue');

    await page.goto('/');

    await expect(page).toHaveURL('/');
  });
});
