import type { Page, Route } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedStoryIds, test } from '../fixtures/test';

// 스토리 상세는 GET /api/v1/stories/{id} 로 단건 조회한다. (/stories/[id]는 온보딩 게이팅 없음)
const STORY_DETAIL = '**/api/v1/stories/s1';

const storyDetail = {
  id: 's1',
  title: '용의 계곡',
  oneLineIntro: '잃어버린 용을 찾는 모험',
  description: '깊은 계곡 속 전설의 이야기',
  genres: ['판타지', '모험'],
  turnCount: 1280,
  author: { id: null, nickname: '마냑', profileImageUrl: null },
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

// 인물 이미지는 채팅과 같은 CDN 인물 경로 계약을 따른다. 이미지 생성에 실패한
// 인물은 imageUrl이 null로 내려오므로 이름만 남는 경우도 함께 덮는다.
const STORY_CHARACTERS = [
  {
    name: '이무기',
    imageUrl: 'https://cdn.manyak.app/characters/generated/s1/imugi.webp',
  },
  { name: '계곡지기', imageUrl: null },
];

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
    await expect(page.getByText('제작자')).toBeVisible();
    await expect(page.getByText('마냑', { exact: true })).toBeVisible();
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

    const header = page.locator('header');

    await expect(header).toHaveCSS('--story-header-alpha', '0');

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

  test('주변 인물 이름과 인물 이미지를 보여준다 (KNK-1058)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...storyDetail, characters: STORY_CHARACTERS }),
      });
    });
    await page.route('**/_next/image**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: TINY_PNG });
    });

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('heading', { name: '주변 인물' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: '이무기' })).toBeVisible();
    await expect(
      page.getByRole('img', { name: '이무기 인물 이미지' }),
    ).toBeVisible();

    // 이미지가 없는 인물도 이름은 남는다
    await expect(page.getByRole('heading', { name: '계곡지기' })).toBeVisible();
    await expect(
      page.getByRole('img', { name: '계곡지기 인물 이미지' }),
    ).toHaveCount(0);
  });

  test('느린 조회 후 본문 제목이 사라지면 헤더 제목을 보여준다 (KNK-1039)', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 650));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...storyDetail, thumbnailUrl: THUMBNAIL_URL }),
      });
    });
    await page.route('**/_next/image**', async (route) => {
      await route.fulfill({ contentType: 'image/png', body: TINY_PNG });
    });

    await page.goto('/stories/s1');

    const contentTitle = page.getByRole('heading', {
      level: 1,
      name: '용의 계곡',
    });
    const headerTitle = page.locator('header').getByText('용의 계곡');

    await expect(contentTitle).toBeVisible();
    await expect(headerTitle).toHaveCSS('opacity', '0');

    await page.locator('main').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect
      .poll(() =>
        contentTitle.evaluate(
          (element) => element.getBoundingClientRect().bottom,
        ),
      )
      .toBeLessThanOrEqual(56);
    await expect(headerTitle).toHaveCSS('opacity', '1');
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

test.describe('스토리 상세 옵션 메뉴 (KNK-1186)', () => {
  const STORY_REPORT = '**/api/v1/stories/s1/reports';

  const openOptionsMenu = async (page: Page) => {
    await page.getByRole('button', { name: '스토리 옵션 더보기' }).click();
  };

  const openReportSheet = async (page: Page) => {
    await openOptionsMenu(page);
    await page
      .getByRole('menuitem', { name: STORY_REPORT_COPY.action })
      .click();

    return page.getByRole('dialog', { name: STORY_REPORT_COPY.title });
  };

  test('게스트에게는 내가 만들지 않은 스토리의 옵션 메뉴가 없다', async ({
    page,
  }) => {
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    await page.goto('/stories/s1');

    await expect(
      page.getByRole('heading', { level: 1, name: '용의 계곡' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: '스토리 옵션 더보기' }),
    ).toHaveCount(0);
  });

  test('게스트가 만든 스토리는 메뉴에 삭제하기만 있고 신고하기는 없다', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    await page.goto('/stories/s1');
    await openOptionsMenu(page);

    await expect(
      page.getByRole('menuitem', { name: '삭제하기' }),
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: STORY_REPORT_COPY.action }),
    ).toHaveCount(0);
  });

  test('회원은 사유를 고른 뒤 신고를 보낼 수 있고 접수되면 시트가 닫힌다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await page.route(STORY_DETAIL, fulfillStoryDetail);

    let reportBody: unknown = null;

    await page.route(STORY_REPORT, async (route) => {
      reportBody = route.request().postDataJSON();
      await route.fulfill({ status: 201, body: '' });
    });

    await page.goto('/stories/s1');

    const sheet = await openReportSheet(page);
    const submitButton = sheet.getByRole('button', {
      name: STORY_REPORT_COPY.submit,
    });

    await expect(sheet.getByText(STORY_REPORT_COPY.description)).toBeVisible();
    await expect(submitButton).toBeDisabled();

    const closeButton = sheet.getByRole('button', {
      name: STORY_REPORT_COPY.close,
    });

    await expect(closeButton).toHaveCSS('height', '24px');
    await expect(closeButton).toHaveCSS('align-self', 'center');
    await expect(closeButton.locator('..')).toHaveCSS('row-gap', '4px');

    await sheet.getByRole('radio', { name: '부적절한 내용' }).check();
    await expect(submitButton).toBeEnabled();
    await sheet
      .getByRole('textbox', { name: STORY_REPORT_COPY.detailLabel })
      .fill('폭력적인 묘사가 있어요');
    await submitButton.click();

    await expect(page.getByText(TOAST_MESSAGE.STORY_REPORTED)).toBeVisible();
    await expect(sheet).toBeHidden();
    expect(reportBody).toEqual({
      reason: 'INAPPROPRIATE',
      detail: '폭력적인 묘사가 있어요',
    });
  });

  test('신고 접수에 실패하면 시트와 입력이 그대로 남는다', async ({ page }) => {
    await mockMemberSession(page);
    await page.route(STORY_DETAIL, fulfillStoryDetail);
    await page.route(STORY_REPORT, async (route) => {
      await route.fulfill({ status: 500, body: '' });
    });

    await page.goto('/stories/s1');

    const sheet = await openReportSheet(page);
    const detailInput = sheet.getByRole('textbox', {
      name: STORY_REPORT_COPY.detailLabel,
    });

    await sheet.getByRole('radio', { name: '기타' }).check();
    await detailInput.fill('설명이 어색해요');
    await sheet.getByRole('button', { name: STORY_REPORT_COPY.submit }).click();

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_REPORT_FAILED),
    ).toBeVisible();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('radio', { name: '기타' })).toBeChecked();
    await expect(detailInput).toHaveValue('설명이 어색해요');
  });

  test('회원이 만든 스토리는 메뉴에서 삭제하면 제작 목록으로 돌아간다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await page.route(STORY_DETAIL, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...storyDetail, isOwner: true }),
      });
    });

    await page.goto('/stories/s1');
    await openOptionsMenu(page);

    await expect(
      page.getByRole('menuitem', { name: STORY_REPORT_COPY.action }),
    ).toBeVisible();
    await page.getByRole('menuitem', { name: '삭제하기' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(dialog.getByText('스토리를 삭제할까요?')).toBeVisible();
    await dialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText(TOAST_MESSAGE.STORY_DELETED)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
  });
});
