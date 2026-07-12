import { expect, skipOnboarding, test } from '../fixtures/test';

// 모든 백엔드 호출은 /api 프록시를 거치며, 피드백 등록은 POST /api/v1/feedbacks 다.
// fixture의 기본 모킹(**/api/**) 위에 더 구체적인 라우트를 등록해 응답을 제어한다
// (Playwright는 나중에 등록한 라우트를 먼저 매칭한다).
const FEEDBACK_ENDPOINT = '**/api/v1/feedbacks';

test.describe('피드백 제출', () => {
  test('본문과 이메일을 입력해 제출하면 성공 안내가 뜨고 폼이 비워진다 (US-7-1·7-3)', async ({
    page,
  }) => {
    let submittedBody: unknown = null;

    await page.route(FEEDBACK_ENDPOINT, async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: '',
      });
    });

    await skipOnboarding(page);
    await page.goto('/more/feedback');

    await page
      .getByRole('textbox', { name: '피드백 내용' })
      .fill('버튼이 너무 작아요');
    await page
      .getByRole('textbox', { name: '답변 받을 이메일' })
      .fill('me@example.com');
    await page.getByRole('button', { name: '피드백 보내기' }).click();

    await expect(
      page.getByText('소중한 피드백을 보내주셔서 감사해요'),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: '피드백 내용' }),
    ).toHaveValue('');
    expect(submittedBody).toEqual({
      body: '버튼이 너무 작아요',
      email: 'me@example.com',
      platform: 'WEB',
    });
  });

  test('이메일 없이 본문만으로도 제출되며 email은 null로 전송된다 (US-7-2)', async ({
    page,
  }) => {
    let submittedBody: unknown = null;

    await page.route(FEEDBACK_ENDPOINT, async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: '',
      });
    });

    await skipOnboarding(page);
    await page.goto('/more/feedback');

    await page
      .getByRole('textbox', { name: '피드백 내용' })
      .fill('이메일 없이 보냅니다');
    await page.getByRole('button', { name: '피드백 보내기' }).click();

    await expect(
      page.getByText('소중한 피드백을 보내주셔서 감사해요'),
    ).toBeVisible();
    expect(submittedBody).toMatchObject({ email: null });
  });

  test('본문이 비어 있으면 버튼 위에 오류를 표시하고 입력하면 해제한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/more/feedback');

    const submit = page.getByRole('button', { name: '피드백 보내기' });
    const footer = submit.locator('..');
    const validationError = page.getByText('피드백 내용을 입력해주세요');

    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(footer.getByText('피드백 내용을 입력해주세요')).toBeVisible();

    await page.getByRole('textbox', { name: '피드백 내용' }).fill('개선 의견');
    await expect(validationError).toBeHidden();
  });

  test('피드백 제출 중 버튼 문구 대신 스피너를 표시한다', async ({ page }) => {
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(FEEDBACK_ENDPOINT, async (route) => {
      await responseGate;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: '',
      });
    });

    await skipOnboarding(page);
    await page.goto('/more/feedback');
    await page
      .getByRole('textbox', { name: '피드백 내용' })
      .fill('로딩 상태 확인');

    const submit = page.getByRole('button', { name: '피드백 보내기' });

    await submit.click();

    const loadingSpinner = page.getByLabel('피드백 전송 중');

    await expect(loadingSpinner).toBeVisible();
    await expect(
      loadingSpinner.locator('xpath=ancestor::button'),
    ).toBeDisabled();

    releaseResponse();
    await expect(
      page.getByText('소중한 피드백을 보내주셔서 감사해요'),
    ).toBeVisible();
  });

  test('제출이 실패하면 오류 안내가 뜬다 (US-7-3)', async ({ page }) => {
    await page.route(FEEDBACK_ENDPOINT, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: '{}',
      });
    });

    await skipOnboarding(page);
    await page.goto('/more/feedback');

    await page
      .getByRole('textbox', { name: '피드백 내용' })
      .fill('실패 케이스');
    await page.getByRole('button', { name: '피드백 보내기' }).click();

    await expect(page.getByText('피드백 전송에 실패했어요')).toBeVisible();
  });
});
