import type { UserConsentResponse } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { CONSENT_SHEET_COPY } from '@/features/auth/_shared/constants/consent';

import {
  expect,
  mockConsents,
  mockMemberSession,
  seedPendingLogin,
  skipOnboarding,
  test,
} from '../fixtures/test';
import { VISUAL_FIXED_NOW, waitForFonts } from '../fixtures/visual';

/**
 * 로그인 화면·필수 동의 시트의 정적 상태를 비교하는 비주얼 회귀 스펙.
 * 뒤로가기·이동·동의 동작 검증은 `my/login-page.spec.ts`·`auth/consent.spec.ts`가 담당한다.
 */

/** 세 항목 모두 동의가 필요한 상태. 시트의 전체 구성을 한 장에 담는다. */
const PENDING_CONSENTS: UserConsentResponse = {
  terms: { requiredVersion: 'v1.2', needsConsent: true },
  privacy: { requiredVersion: 'v1.4', needsConsent: true },
  age14: { requiredVersion: '1', needsConsent: true },
};

test.describe('계정 비주얼', () => {
  test('로그인 페이지: 단일 CTA, 이관 안내·약관 고지 없음 (AUTH-LOGIN)', async ({
    page,
  }) => {
    await skipOnboarding(page);

    await page.goto('/login');

    await expect(
      page.getByRole('button', { name: /Google로 시작하기/ }),
    ).toBeVisible();
    await expect(page.getByText('계정마다 처음 로그인할 때')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: '서비스 이용약관', exact: true }),
    ).toHaveCount(0);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('로그인 직후 필수 동의 시트 초기 상태 (AUTH-CONSENT-03)', async ({
    page,
  }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
    await skipOnboarding(page);
    await mockMemberSession(page);
    await seedPendingLogin(page);
    await mockConsents(page, PENDING_CONSENTS);

    await page.goto(APP_PATH.MAIN.STORIES);

    const dialog = page.getByRole('dialog', { name: CONSENT_SHEET_COPY.title });

    await expect(
      dialog.getByRole('button', { name: CONSENT_SHEET_COPY.submit }),
    ).toBeDisabled();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('consent-sheet.png');
  });
});
