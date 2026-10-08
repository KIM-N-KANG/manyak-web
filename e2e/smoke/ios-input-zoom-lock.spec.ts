import { APP_PATH } from '@/constants/app-path';

import { expect, skipOnboarding, test } from '../fixtures/test';

// iOS Safari는 16px 미만 입력 칸에 포커스하면 화면을 확대하므로 viewport에 maximum-scale=1을 둔다.
// Next는 클라이언트 이동마다 viewport 메타를 새 요소로 바꾸므로, 이동한 뒤에도 남아 있는지 확인한다.
// Android Chrome은 maximum-scale이 핀치 확대까지 막으므로 붙이지 않는다.
test('iOS에서만 화면을 이동해도 입력 칸 자동 확대 방지를 유지한다', async ({
  page,
  browserName,
}) => {
  await skipOnboarding(page);
  await page.goto(APP_PATH.MAIN.STORIES);

  const viewport = page.locator('meta[name="viewport"]');
  const expected =
    browserName === 'webkit' ? /maximum-scale=1/ : /^(?!.*maximum-scale)/;

  await expect(viewport).toHaveAttribute('content', expected);

  await page
    .getByRole('navigation', { name: '하단 네비게이션' })
    .getByRole('link', { name: '마이' })
    .click();
  await expect(page).toHaveURL(APP_PATH.MAIN.MY);
  await expect(viewport).toHaveAttribute('content', expected);
});
