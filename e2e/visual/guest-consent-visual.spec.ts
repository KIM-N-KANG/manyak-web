import { GUEST_CONSENT_COPY as COPY } from '@/features/auth/_shared/constants/guest-consent';

import { prepareStoryGeneration } from '../fixtures/story-generation';
import { expect, skipOnboarding, test } from '../fixtures/test';
import { VISUAL_FIXED_NOW, waitForFonts } from '../fixtures/visual';

for (const theme of ['light', 'dark']) {
  test(`게스트 동의 안내와 상세 (${theme})`, async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
    await skipOnboarding(page);
    await page.addInitScript(
      (value) => localStorage.setItem('theme', value),
      theme,
    );

    const generate = await prepareStoryGeneration(page);

    await generate.click();

    const sheet = page.getByRole('dialog');

    await expect(
      sheet.getByRole('heading', { name: COPY.title }),
    ).toBeVisible();
    await waitForFonts(page);

    for (const heading of [COPY.aiTitle, COPY.safetyTitle, COPY.consentTitle]) {
      const cardTitle = sheet.getByRole('heading', { name: heading });

      await expect(cardTitle).toHaveCSS('font-size', '16px');
      await expect(cardTitle).toHaveCSS('font-weight', '700');
    }

    const detailButton = sheet.getByRole('button', { name: COPY.detail });
    const consentTitle = sheet.getByRole('heading', {
      name: COPY.consentTitle,
    });

    await expect(detailButton).toHaveCSS('height', '24px');
    await expect(detailButton).toHaveCSS('text-decoration-line', 'none');
    await expect
      .poll(async () => {
        const buttonBox = await detailButton.boundingBox();
        const titleBox = await consentTitle.boundingBox();

        return (
          buttonBox !== null &&
          titleBox !== null &&
          Math.abs(buttonBox.y - titleBox.y) < 1 &&
          buttonBox.x >= titleBox.x + titleBox.width - 1
        );
      })
      .toBe(true);
    await expect
      .poll(() =>
        sheet.evaluate((element) => {
          const title = element
            .querySelector('[data-slot="drawer-title"]')!
            .getBoundingClientRect();
          const cards = Array.from(
            element.querySelectorAll('section'),
            (card) => card.getBoundingClientRect(),
          );
          const button = element
            .querySelector('[data-slot="drawer-footer"] button')!
            .getBoundingClientRect();

          return [
            cards[0].top - title.bottom,
            cards[1].top - cards[0].bottom,
            cards[2].top - cards[1].bottom,
            button.top - cards[2].bottom,
          ].map(Math.round);
        }),
      )
      .toEqual([32, 8, 8, 32]);
    await expect(page).toHaveScreenshot(`guest-consent-${theme}.png`);
    await sheet.getByRole('button', { name: COPY.detail }).click();
    await expect(
      sheet.getByRole('heading', { name: COPY.detailTitle }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: COPY.agree }),
    ).toBeInViewport();
    await expect(page).toHaveScreenshot(`guest-consent-detail-${theme}.png`);
    await sheet
      .getByRole('link', { name: COPY.privacy })
      .scrollIntoViewIfNeeded();
    await expect(
      sheet.getByRole('link', { name: COPY.privacy }),
    ).toBeInViewport();
    await expect(
      sheet.getByRole('heading', { name: COPY.detailTitle }),
    ).toBeInViewport();
    await expect(
      sheet.getByRole('button', { name: COPY.agree }),
    ).toBeInViewport();
  });
}
