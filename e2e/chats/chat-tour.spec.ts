import { type Page } from '@playwright/test';

import { expect, skipChatTour, test } from '../fixtures/test';

// 채팅 화면 안내 투어(KNK-694): 턴 0개 첫 진입 시 자동 노출, 헤더 메뉴로 재열람.
const CHAT_DETAIL = '**/api/v1/chats/c1';

// 기본 모드가 블럭 입력이므로, 일반 모드 검증은 저장된 모드를 미리 심는다.
const setPlainInputMode = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('manyak:chat-input-mode', 'plain');
  });
};

const chatDetail = () => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns: [],
  suggestedInputs: ['던전에 진입한다', '주변을 둘러본다', '용에게 말을 건다'],
});

test.describe('채팅 화면 안내 투어', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });
  });

  test('첫 진입 시 투어가 자동 노출되고 3스텝을 완주할 수 있다', async ({
    page,
  }) => {
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await expect(tour.getByText('상황 · 대사 추가')).toBeVisible();

    await tour.getByRole('button', { name: '다음' }).click();
    await expect(tour.getByText('입력 설정')).toBeVisible();

    await tour.getByRole('button', { name: '다음' }).click();
    await expect(tour.getByText('랜덤 전송')).toBeVisible();

    await tour.getByRole('button', { name: '완료' }).click();
    await expect(tour).toBeHidden();
  });

  test('일반 입력 모드에서는 첫 스텝을 상황 추가로만 안내한다', async ({
    page,
  }) => {
    await setPlainInputMode(page);
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await expect(tour.getByText('상황 추가', { exact: true })).toBeVisible();
    await expect(tour.getByText('상황 · 대사 추가')).toBeHidden();

    await tour.getByRole('button', { name: '다음' }).click();
    await expect(tour.getByText('입력 설정')).toBeVisible();
  });

  test('넓은 화면에서도 안내 카드가 앱 프레임을 벗어나지 않는다', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();

    const card = tour.getByText('상황 · 대사 추가');
    const cardBox = await card.locator('..').boundingBox();
    const frameBox = await page.locator('#app-frame').boundingBox();

    expect(cardBox).not.toBeNull();
    expect(frameBox).not.toBeNull();
    expect(cardBox!.x).toBeGreaterThanOrEqual(frameBox!.x);
    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(
      frameBox!.x + frameBox!.width,
    );
    expect(cardBox!.y).toBeGreaterThanOrEqual(0);
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(800);
  });

  test('건너뛰면 닫히고 재진입 시 다시 뜨지 않는다', async ({ page }) => {
    await page.goto('/chats/c1');

    const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

    await expect(tour).toBeVisible();
    await tour.getByRole('button', { name: '건너뛰기' }).click();
    await expect(tour).toBeHidden();

    await page.reload();
    await expect(
      page.getByText('안개 낀 계곡 앞에 한 용사가 섰다.'),
    ).toBeVisible();
    await expect(tour).toBeHidden();
  });
});

test.describe('추천 입력 힌트', () => {
  test.beforeEach(async ({ page }) => {
    await skipChatTour(page);
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });
  });

  test('첫 진입 시 추천 입력 위에 힌트가 보이고 재진입 시 사라진다', async ({
    page,
  }) => {
    await page.goto('/chats/c1');

    const hint = page.getByText('AI가 추천하는 입력이에요');

    await expect(hint).toBeVisible();
    await expect(
      page.getByRole('button', { name: '던전에 진입한다' }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('button', { name: '던전에 진입한다' }),
    ).toBeVisible();
    await expect(hint).toBeHidden();
  });
});
