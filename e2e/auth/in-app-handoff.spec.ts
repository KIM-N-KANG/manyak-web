import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';

import {
  expect,
  mockHandoffCreate,
  mockHandoffSession,
  mockHandoffStatus,
  seedCampaignCookie,
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

  test('인앱에서도 전면 차단 없이 제작 스토리 목록을 이용한다', async ({
    page,
  }) => {
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

    await page.goto(APP_PATH.MAIN.STUDIO);

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

  test('전환 URL에 유입 출처(UTM)를 함께 실어 보낸다', async ({ page }) => {
    await skipOnboarding(page);
    await seedCampaignCookie(page, {
      utm_source: 'ig',
      utm_medium: 'paid',
      utm_campaign: 'KR_META_WEB_ACTIVATION_COLD_202608',
      utm_id: '120210',
      referrer: 'https://instagram.com/',
      fbclid: 'should-not-travel',
    });
    await mockHandoffCreate(page, {
      handoffCode: 'handoff-code-1',
      handoffId: 'handoff-id-1',
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /Google로 시작하기/ }).click();

    await expect(page).toHaveURL(/\/login\/continue\?handoff=handoff-code-1/);

    // 외부 브라우저는 저장소가 격리되고 스킴 실행이라 referrer도 없어, URL이 유입
    // 출처를 잇는 유일한 수단이다(KNK-964).
    const params = new URL(page.url()).searchParams;

    expect(params.get('utm_source')).toBe('ig');
    expect(params.get('utm_medium')).toBe('paid');
    expect(params.get('utm_campaign')).toBe(
      'KR_META_WEB_ACTIVATION_COLD_202608',
    );
    expect(params.get('utm_id')).toBe('120210');
    // UTM 계열만 싣는다.
    expect(params.get('referrer')).toBeNull();
    expect(params.get('fbclid')).toBeNull();
  });

  test('유입 출처가 없으면 전환 URL을 그대로 둔다', async ({ page }) => {
    await skipOnboarding(page);
    await seedCampaignCookie(page, { utm_source: '', utm_campaign: '' });
    await mockHandoffCreate(page, {
      handoffCode: 'handoff-code-1',
      handoffId: 'handoff-id-1',
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /Google로 시작하기/ }).click();

    // Amplitude는 캠페인 없는 진입에 빈 문자열을 써 넣으므로, 그대로 실으면 외부
    // 브라우저의 기존 귀속을 빈 값으로 덮어쓴다.
    await expect(page).toHaveURL('/login/continue?handoff=handoff-code-1');
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

  test('외부 로그인을 마치고 인앱 문서로 돌아오면 다시 확인해 정리한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await seedStoryIds(page, ['s1']);
    await seedChatIds(page, ['c1']);
    await seedPendingHandoff(page, {
      code: 'handoff-code-1',
      handoffId: 'handoff-id-1',
      storyIds: ['s1'],
      chatIds: ['c1'],
    });
    // 첫 조회는 외부 로그인 이전이라 아직 이관 전 상태만 보인다.
    await mockHandoffStatus(page, { status: 'PENDING' });

    const firstStatus = page.waitForResponse((response) =>
      response.url().includes('/auth/handoffs/status'),
    );

    await page.goto('/');
    await firstStatus;

    await expect(
      readLocalStorage(page, 'manyak:pending-login-handoff'),
    ).resolves.not.toBeNull();

    // 외부 브라우저에서 로그인·이관이 끝난 뒤 인앱 문서가 다시 보이는 상황.
    await mockHandoffStatus(page, {
      status: 'MIGRATED',
      migratedStoryIds: ['s1'],
      migratedChatIds: ['c1'],
    });
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange')),
    );

    await expect(
      page.getByText('스토리 1개, 채팅 1개를 계정으로 옮겼어요'),
    ).toBeVisible();
    await expect
      .poll(() => readLocalStorage(page, 'manyak:pending-login-handoff'))
      .toBeNull();
  });

  test('일시적인 상태 조회 실패에는 진행 중 핸드오프를 남긴다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await seedStoryIds(page, ['s1']);
    await seedPendingHandoff(page, {
      code: 'handoff-code-1',
      handoffId: 'handoff-id-1',
      storyIds: ['s1'],
      chatIds: [],
    });
    await page.route('**/api/v1/auth/handoffs/status', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unavailable' }),
      });
    });

    const statusResponse = page.waitForResponse((response) =>
      response.url().includes('/auth/handoffs/status'),
    );

    await page.goto('/');
    await statusResponse;

    // 코드를 버리면 이후 어떤 재방문으로도 이관 결과를 회수할 수 없다.
    await expect(
      readLocalStorage(page, 'manyak:pending-login-handoff'),
    ).resolves.not.toBeNull();
    await expect(
      readLocalStorage(page, 'manyak:created-story-ids'),
    ).resolves.toBe(JSON.stringify(['s1']));
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
      page.getByRole('button', { name: /카카오로 시작하기/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    // 로그인 페이지와 동일하게 약관 동의 고지를 상시 표시한다.
    await expect(
      page.getByRole('link', { name: '서비스이용약관' }),
    ).toBeVisible();
  });

  test('쿼리 제거는 핸드오프 코드에만 적용하고 유입 출처는 남긴다', async ({
    page,
  }) => {
    await mockHandoffSession(page, {
      body: { storyCount: 1, chatCount: 1, callbackPath: '/' },
    });

    await page.goto(
      '/login/continue?handoff=handoff-code-1&utm_source=ig&utm_campaign=summer',
    );

    // 캠페인 파라미터까지 지우면 분석 SDK 초기화가 이보다 늦을 때 유입 출처를 읽을
    // 기회가 사라진다(KNK-964).
    await expect(page).toHaveURL(
      '/login/continue?utm_source=ig&utm_campaign=summer',
    );
    await expect(page.getByText(/계정당 한 번만 진행돼요/)).toBeVisible();
  });

  test('만료된 코드는 만료 안내를 보여준다', async ({ page }) => {
    await mockHandoffSession(page, { status: 404 });

    await page.goto('/login/continue?handoff=expired');

    await expect(page.getByText('링크가 만료됐어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '로그인하러 가기' }),
    ).toBeVisible();
  });

  test('일시적인 수령 실패는 재시도 안내를 보여주고, 다시 시도하면 진행한다', async ({
    page,
  }) => {
    await mockHandoffSession(page, { status: 502 });

    await page.goto('/login/continue?handoff=handoff-code-1');

    await expect(
      page.getByRole('heading', { name: '잠시 문제가 생겼어요' }),
    ).toBeVisible();
    // 재시도가 같은 코드를 다시 써야 하므로 쿼리는 남긴다.
    await expect(page).toHaveURL('/login/continue?handoff=handoff-code-1');

    await mockHandoffSession(page, {
      body: { storyCount: 1, chatCount: 1, callbackPath: '/' },
    });
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(page).toHaveURL('/login/continue');
    await expect(
      page.getByRole('button', { name: /Google로 시작하기/ }),
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
