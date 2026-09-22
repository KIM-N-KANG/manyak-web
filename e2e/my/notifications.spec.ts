import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  PUSH_CONSENT_NOTICE_COPY,
  PUSH_SETTINGS_COPY,
} from '@/features/my/_shared/constants/push-copy';

import {
  expect,
  mockMemberSession,
  mockPushSettings,
  skipOnboarding,
  test,
} from '../fixtures/test';

const PUSH_SETTINGS = '**/api/v1/users/me/push-settings';

// E2E 빌드는 Firebase VAPID 키를 비워 웹 푸시가 꺼진 상태다(playwright.config). 그래서
// 브라우저 알림 줄은 항상 "지원하지 않음"이며, 권한 요청·토큰 등록·제작 직후 프롬프트는
// 실기기에서 수동 검증한다. 여기서는 설정 조회·전체 교체 저장·처리 결과 통지만 다룬다.
test.describe('알림 설정', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('게스트는 로그인으로 이동한다', async ({ page }) => {
    await page.goto(APP_PATH.MY_NOTIFICATIONS);

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}$`));
  });

  test('회원은 마이 메뉴에서 알림 설정으로 들어가 세 종류를 본다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await page.goto(APP_PATH.MAIN.MY);
    await page
      .getByRole('link', { name: PUSH_SETTINGS_COPY.menuLabel })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_NOTIFICATIONS}$`));
    await expect(
      page.getByRole('banner').getByText(PUSH_SETTINGS_COPY.title),
    ).toBeVisible();
    await expect(
      page.getByText(PUSH_SETTINGS_COPY.permissionUnsupported),
    ).toBeVisible();
    await expect(
      page.getByRole('switch', { name: PUSH_SETTINGS_COPY.service }),
    ).toBeChecked();
    await expect(
      page.getByRole('switch', { name: PUSH_SETTINGS_COPY.marketing }),
    ).not.toBeChecked();
    await expect(
      page.getByRole('switch', { name: PUSH_SETTINGS_COPY.marketingNight }),
    ).toBeHidden();
  });

  test('광고 알림을 켜면 전체 교체 PUT 뒤 처리 결과를 통지하고 야간 줄이 나타난다', async ({
    page,
  }) => {
    await mockMemberSession(page);

    const putRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/users/me/push-settings') &&
        request.method() === 'PUT',
    );

    await page.goto(APP_PATH.MY_NOTIFICATIONS);
    await page
      .getByRole('switch', { name: PUSH_SETTINGS_COPY.marketing })
      .click();

    expect((await putRequest).postDataJSON()).toEqual({
      servicePush: true,
      marketingPush: true,
      marketingNightPush: false,
    });

    const notice = page.getByRole('alertdialog');

    await expect(notice).toContainText(PUSH_CONSENT_NOTICE_COPY.title);
    await expect(notice).toContainText(
      PUSH_CONSENT_NOTICE_COPY.result.marketingOn,
    );
    await expect(notice).toContainText(PUSH_CONSENT_NOTICE_COPY.sender);
    await notice
      .getByRole('button', { name: PUSH_CONSENT_NOTICE_COPY.close })
      .click();

    await expect(notice).toBeHidden();
    await expect(
      page.getByRole('switch', { name: PUSH_SETTINGS_COPY.marketingNight }),
    ).toBeVisible();
  });

  test('광고 알림을 끄면 야간도 함께 꺼진 본문을 보내고 철회를 통지한다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockPushSettings(page, {
      marketingPush: true,
      marketingNightPush: true,
    });

    const putRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/users/me/push-settings') &&
        request.method() === 'PUT',
    );

    await page.goto(APP_PATH.MY_NOTIFICATIONS);
    await page
      .getByRole('switch', { name: PUSH_SETTINGS_COPY.marketing })
      .click();

    expect((await putRequest).postDataJSON()).toEqual({
      servicePush: true,
      marketingPush: false,
      marketingNightPush: false,
    });
    await expect(page.getByRole('alertdialog')).toContainText(
      PUSH_CONSENT_NOTICE_COPY.result.marketingOff,
    );
  });

  test('서비스 알림 토글은 통지 없이 저장되고 실패하면 토스트와 함께 원복된다', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await page.goto(APP_PATH.MY_NOTIFICATIONS);

    const service = page.getByRole('switch', {
      name: PUSH_SETTINGS_COPY.service,
    });

    await service.click();

    await expect(service).not.toBeChecked();
    await expect(page.getByRole('alertdialog')).toBeHidden();

    await page.route(PUSH_SETTINGS, async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 500, body: '{}' });

        return;
      }

      await route.fallback();
    });
    await service.click();

    await expect(
      page.getByText(TOAST_MESSAGE.PUSH_SETTINGS_SAVE_FAILED),
    ).toBeVisible();
    await expect(service).not.toBeChecked();
  });

  test('설정 조회에 실패하면 안내와 다시 시도를 보여준다', async ({ page }) => {
    await mockMemberSession(page);
    await mockPushSettings(page, {}, 500);
    await page.goto(APP_PATH.MY_NOTIFICATIONS);

    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: PUSH_SETTINGS_COPY.loadFailed }),
    ).toBeVisible();

    await mockPushSettings(page);
    await page.getByRole('button', { name: PUSH_SETTINGS_COPY.retry }).click();

    await expect(
      page.getByRole('switch', { name: PUSH_SETTINGS_COPY.service }),
    ).toBeChecked();
  });
});
