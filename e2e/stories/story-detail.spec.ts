import type { Route } from '@playwright/test';

import { expect, test } from '../fixtures/test';

// 스토리 상세는 GET /api/v1/stories/{id} 로 단건 조회한다. (/stories/[id]는 온보딩 게이팅 없음)
const STORY_DETAIL = '**/api/v1/stories/s1';

const storyDetail = {
  id: 's1',
  title: '용의 계곡',
  oneLineIntro: '잃어버린 용을 찾는 모험',
  description: '깊은 계곡 속 전설의 이야기',
  genres: ['판타지', '모험'],
  turnCount: 1280,
  createdAt: '2026-06-24T12:00:00Z',
  reachedEndings: ['용과 맺은 약속'],
  startSettings: [
    {
      id: 'ss1',
      name: '계곡 입구',
      prologue: '안개 낀 계곡 앞에 섰다',
      startSituation: '용의 흔적을 따라왔다',
      endings: [
        {
          name: '잃어버린 용과의 재회',
          requirement: { minTurns: 10, achievementCondition: '용을 찾는다' },
          epilogue: '두 존재가 다시 만난다',
        },
      ],
    },
    {
      id: 'ss2',
      name: '용의 둥지',
      prologue: '거대한 둥지 앞에 도착했다',
      startSituation: '용의 숨소리가 들려온다',
      endings: [{ name: '새로운 수호자' }],
    },
  ],
};

const fulfillStoryDetail = async (route: Route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(storyDetail),
  });
};

const THUMBNAIL_URL = 'https://cdn.manyak.app/thumbnails/dragon.png';

// 1x1 투명 PNG. 썸네일 요청이 외부 네트워크로 나가지 않도록 목킹에 쓴다.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('스토리 상세', () => {
  test('스토리 제목·소개·설명을 보여준다 (US-4-1)', async ({ page }) => {
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('heading', { level: 1, name: '용의 계곡' }),
    ).toBeVisible();
    await expect(page.getByText('잃어버린 용을 찾는 모험')).toBeVisible();
    await expect(page.getByText('깊은 계곡 속 전설의 이야기')).toBeVisible();
    await expect(page.getByText('누적 턴 수 1,280')).toBeVisible();
    await expect(page.getByText('생성일')).toBeVisible();
    await expect(page.getByText('2026-06-24')).toBeVisible();
    await expect(page.getByText('용과 맺은 약속')).toBeVisible();

    const cta = page
      .getByRole('button', { name: '새 채팅 시작하기' })
      .locator('xpath=ancestor::nav');

    await expect(cta).toHaveCSS('padding-top', '0px');
  });

  test('브라우저 탭 제목이 스토리 제목 - 마냑이 된다', async ({ page }) => {
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    await page.goto('/stories/s1');

    await expect(page).toHaveTitle('용의 계곡 - 마냑');
  });

  test('썸네일이 있으면 상단 이미지와 턴 수 뱃지를 보여준다 (US-4-1)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...storyDetail, thumbnailUrl: THUMBNAIL_URL }),
      });
    });
    // 썸네일 <Image>는 Next 최적화(/_next/image)를 타므로, 원본 URL 대신
    // 브라우저가 실제로 요청하는 최적화 엔드포인트를 가로챈다. (서버사이드
    // fetch·remotePatterns 검증을 우회)
    await page.route('**/_next/image**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: TINY_PNG });
    });

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('img', { name: '스토리 썸네일' }),
    ).toBeVisible();
    await expect(page.getByText('누적 턴 수 1,280')).toBeVisible();

    const headerGradientCount = await page
      .locator('header, header *')
      .evaluateAll(
        (elements) =>
          elements.filter((element) =>
            getComputedStyle(element).backgroundImage.includes('gradient'),
          ).length,
      );

    expect(headerGradientCount).toBe(0);
  });

  test('썸네일을 누르면 이미지 뷰어가 열리고 X·뒤로가기로 닫힌다 (US-4-1)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...storyDetail, thumbnailUrl: THUMBNAIL_URL }),
      });
    });
    // 썸네일 <Image>는 Next 최적화(/_next/image)를 타므로, 원본 URL 대신
    // 브라우저가 실제로 요청하는 최적화 엔드포인트를 가로챈다. (서버사이드
    // fetch·remotePatterns 검증을 우회)
    await page.route('**/_next/image**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: TINY_PNG });
    });

    await page.goto('/stories/s1');

    const viewer = page.getByRole('dialog', {
      name: '스토리 썸네일 크게 보기',
    });

    // X 버튼으로 닫기: 뷰어만 닫히고 페이지는 그대로다
    await page.getByRole('button', { name: '썸네일 크게 보기' }).click();
    await expect(viewer).toBeVisible();
    await expect(
      viewer.getByRole('img', { name: '스토리 썸네일' }),
    ).toBeVisible();
    await viewer.getByRole('button', { name: '닫기' }).click();
    await expect(viewer).not.toBeVisible();
    await expect(page).toHaveURL(/\/stories\/s1$/);

    // 뒤로가기로 닫기: 뷰어만 닫히고 페이지 이동은 없다
    await page.getByRole('button', { name: '썸네일 크게 보기' }).click();
    await expect(viewer).toBeVisible();
    await page.goBack();
    await expect(viewer).not.toBeVisible();
    await expect(page).toHaveURL(/\/stories\/s1$/);
  });

  test('채팅 시작 상황을 선택하면 상황 설명이 바뀐다 (US-4-1)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('heading', { name: '채팅 시작 상황' }),
    ).toBeVisible();

    // 기본값: 첫 번째 시작 설정
    const trigger = page.getByRole('combobox', { name: '채팅 시작 상황 선택' });

    await expect(trigger).toContainText('계곡 입구');
    await expect(page.getByText('용의 흔적을 따라왔다')).toBeVisible();
    await expect(page.getByText('잃어버린 용과의 재회')).toBeVisible();
    await expect(page.getByText('두 존재가 다시 만난다')).not.toBeVisible();

    await page.getByRole('button', { name: '엔딩 안내' }).click();
    await expect(page.getByText('엔딩은 시작 상황마다 달라져요')).toBeVisible();
    await page.keyboard.press('Escape');

    await trigger.click();

    const secondOption = page.getByRole('option', { name: '용의 둥지' });

    await expect(secondOption).toHaveCSS('border-radius', '10px');
    await secondOption.click();

    await expect(trigger).toContainText('용의 둥지');
    await expect(page.getByText('용의 숨소리가 들려온다')).toBeVisible();
    await expect(page.getByText('새로운 수호자')).toBeVisible();
    await expect(page.getByText('용의 흔적을 따라왔다')).not.toBeVisible();
    await expect(page.getByText('잃어버린 용과의 재회')).not.toBeVisible();
  });

  test('"채팅 시작하기"를 누르면 선택한 시작 설정으로 채팅 화면에 이동한다 (US-4-2)', async ({
    page,
  }) => {
    let createChatBody: Record<string, unknown> | undefined;

    await page.route(STORY_DETAIL, fulfillStoryDetail);
    await page.route('**/api/v1/chats', async (route) => {
      createChatBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'c1', storyId: 's1', prologue: '프롤로그' }),
      });
    });

    await page.goto('/stories/s1');

    // 두 번째 시작 설정을 선택하고 채팅을 시작한다
    await page.getByRole('combobox', { name: '채팅 시작 상황 선택' }).click();
    await page.getByRole('option', { name: '용의 둥지' }).click();
    await page.getByRole('button', { name: '채팅 시작하기' }).click();

    await expect(page).toHaveURL(/\/chats\/c1$/);
    expect(createChatBody).toMatchObject({
      storyId: 's1',
      startSettingId: 'ss2',
    });
  });

  test('새 채팅 시작 중 버튼 문구 대신 스피너를 표시한다', async ({ page }) => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(STORY_DETAIL, fulfillStoryDetail);
    await page.route('**/api/v1/chats', async (route) => {
      await responseGate;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'c1', storyId: 's1', prologue: '프롤로그' }),
      });
    });

    await page.goto('/stories/s1');
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    const loadingSpinner = page.getByLabel('새 채팅 시작 중');

    await expect(loadingSpinner).toBeVisible();
    await expect(
      loadingSpinner.locator('xpath=ancestor::button'),
    ).toBeDisabled();

    releaseResponse();
    await expect(page).toHaveURL(/\/chats\/c1$/);
  });

  test('로드에 실패하면 다시 시도로 복구한다 (US-4-4)', async ({ page }) => {
    let callCount = 0;

    await page.route(STORY_DETAIL, async (route) => {
      callCount += 1;

      if (callCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: '{}',
        });

        return;
      }

      await fulfillStoryDetail(route);
    });

    await page.goto('/stories/s1');

    await expect(page.getByText('스토리를 불러오지 못했어요')).toBeVisible();
    await page.getByRole('button', { name: '다시 시도하기' }).click();

    await expect(
      page.getByRole('heading', { level: 1, name: '용의 계곡' }),
    ).toBeVisible();
  });

  test('없는 스토리에는 재시도 버튼을 표시하지 않는다', async ({ page }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{}',
      });
    });

    await page.goto('/stories/s1');

    await expect(page.getByText('스토리를 찾을 수 없어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '다시 시도하기' }),
    ).not.toBeVisible();
  });
});
