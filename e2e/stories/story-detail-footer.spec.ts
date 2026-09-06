import { APP_PATH } from '@/constants/app-path';

import { expect, test } from '../fixtures/test';

const story = {
  id: 's1',
  title: '용의 계곡',
  description: '깊은 계곡 속 전설의 이야기\n\n'.repeat(20),
  author: { nickname: '마냑' },
  createdAt: '2026-06-01T00:00:00Z',
};

for (const theme of ['light', 'dark']) {
  test(`상세 CTA 배경은 스크롤 끝에서 메타 정보와 연결되고 위로 이동하면 복원된다 (${theme})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (value) => localStorage.setItem('theme', value),
      theme,
    );
    await page.route('**/api/v1/stories/s1', (route) =>
      route.fulfill({ json: story }),
    );
    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await expect(
      page.getByRole('heading', { name: story.title, level: 1 }),
    ).toBeVisible();

    const main = page.getByRole('main');
    const footer = page.getByRole('navigation');
    const metadata = page.getByText('제작자', { exact: true }).locator('../..');
    const baseColor = await main.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const metadataColor = await metadata.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    const footerBounds = await footer.boundingBox();

    await expect(footer).toHaveCSS('background-color', baseColor);
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight - element.clientHeight - 120;
    });
    await expect(footer).not.toHaveCSS('background-color', baseColor);
    await expect(footer).not.toHaveCSS('background-color', metadataColor);
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(footer).toHaveCSS('background-color', metadataColor);
    await expect(main).toHaveCSS('background-color', metadataColor);
    await expect(main.locator(':scope > div').last()).toHaveCSS(
      'background-color',
      baseColor,
    );
    expect(await footer.boundingBox()).toEqual(footerBounds);

    await page.setViewportSize({ width: 393, height: 640 });
    await expect(footer).not.toHaveCSS('background-color', metadataColor);
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(footer).toHaveCSS('background-color', metadataColor);
    await main.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(footer).toHaveCSS('background-color', baseColor);
    await expect(main).toHaveCSS('background-color', baseColor);
  });
}

test('제작자와 생성일이 없으면 스크롤 끝에서도 기본 CTA 배경을 유지한다', async ({
  page,
}) => {
  await page.route('**/api/v1/stories/s1', (route) =>
    route.fulfill({
      json: { ...story, author: null, createdAt: null },
    }),
  );
  await page.goto(APP_PATH.STORY_DETAIL('s1'));
  await expect(
    page.getByRole('heading', { name: story.title, level: 1 }),
  ).toBeVisible();

  const main = page.getByRole('main');
  const baseColor = await main.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );

  await main.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.getByRole('navigation')).toHaveCSS(
    'background-color',
    baseColor,
  );
});
