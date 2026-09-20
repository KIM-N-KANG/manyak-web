import { APP_PATH } from '@/constants/app-path';
import {
  GUEST_CONSENT_COPY as COPY,
  GUEST_CONSENT_STORAGE_KEY,
  GUEST_CONSENT_VERSION,
} from '@/features/auth/_shared/constants/guest-consent';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';

import { oneLine } from '../fixtures/copy';
import { prepareStoryGeneration } from '../fixtures/story-generation';
import {
  EXHAUSTED_TRIALS,
  expect,
  mockTrials,
  skipChatTour,
  skipOnboarding,
  test,
} from '../fixtures/test';

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
  await skipChatTour(page);
  await page.addInitScript(() =>
    localStorage.setItem('manyak:chat-input-mode', 'plain'),
  );
  await page.route('**/api/v1/chats/c1', (route) =>
    route.fulfill({
      json: {
        id: 'c1',
        storyId: 's1',
        storyTitle: '용의 계곡',
        prologue: '새로운 이야기',
        turns: [],
        suggestedInputs: ['문을 연다'],
      },
    }),
  );
});

test('상세와 한 줄 제목을 확인하고 동의하면 원래 메시지를 한 번만 전송한다', async ({
  page,
}) => {
  const bodies: unknown[] = [];

  await page.route('**/api/v1/chats/c1/turns/stream', async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));

  const input = page.getByPlaceholder('이야기를 어떻게 이어갈까요?');

  await input.fill('문을 연다');
  await page.getByRole('button', { name: '전송', exact: true }).click();

  const sheet = page.getByRole('dialog');
  const title = sheet.getByRole('heading', { name: COPY.title });

  await expect(title).toBeVisible();
  await expect(sheet).toBeFocused();
  expect(
    await title.evaluate(
      (el) =>
        el.getBoundingClientRect().height <=
        parseFloat(getComputedStyle(el).lineHeight) + 1,
    ),
  ).toBe(true);
  expect(bodies).toHaveLength(0);
  await expect(sheet.getByRole('checkbox')).toHaveCount(0);
  await sheet.getByRole('button', { name: COPY.detail }).click();
  await expect(
    sheet.getByRole('heading', { name: COPY.detailTitle }),
  ).toBeVisible();
  await expect(sheet.getByRole('link', { name: COPY.privacy })).toHaveAttribute(
    'href',
    APP_PATH.PRIVACY,
  );
  await sheet.getByRole('button', { name: COPY.back }).click();
  await expect(title).toBeVisible();
  await sheet.getByRole('button', { name: COPY.agree, exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toMatchObject({ userInput: '문을 연다' });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      GUEST_CONSENT_STORAGE_KEY,
    ),
  ).toMatchObject({ version: GUEST_CONSENT_VERSION });
  await expect(page).toHaveURL(/\/chats\/c1$/);

  await page.reload();
  await input.fill('다음 이야기');
  await page.getByRole('button', { name: '전송', exact: true }).click();
  await expect.poll(() => bodies.length).toBe(2);
  await expect(sheet).toHaveCount(0);
});

test('뒤로가기는 동의 없이 닫고 입력을 남기며 재시도할 수 있다', async ({
  page,
}) => {
  let requests = 0;

  await page.route('**/api/v1/chats/c1/turns/stream', async (route) => {
    requests++;
    await route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));

  const input = page.getByPlaceholder('이야기를 어떻게 이어갈까요?');

  await input.fill('작성 중');
  await page.getByRole('button', { name: '전송', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(input).toHaveValue('작성 중');
  expect(requests).toBe(0);
  await expect(page).toHaveURL(/\/chats\/c1$/);
  await page.getByRole('button', { name: '전송', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('제작 동의 후에는 채팅에서 다시 묻지 않고 저장소를 지우면 다시 묻는다', async ({
  page,
}) => {
  const generate = await prepareStoryGeneration(page);

  await page.route('**/api/v1/stories/simple/storylines', (route) =>
    route.abort(),
  );
  await generate.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto(APP_PATH.CHAT_ROOM('c1'));

  let requests = 0;

  await page.route('**/api/v1/chats/c1/turns/stream', async (route) => {
    requests++;
    await route.abort();
  });
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await expect.poll(() => requests).toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(
    (key) => localStorage.removeItem(key),
    GUEST_CONSENT_STORAGE_KEY,
  );
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: COPY.title }),
  ).toBeVisible();
  expect(requests).toBe(1);
});

test('동의 후에도 체험 잔여 0이면 전송하지 않고 로그인으로 안내한다', async ({
  page,
}) => {
  await mockTrials(page, EXHAUSTED_TRIALS);

  let requests = 0;

  await page.route('**/api/v1/chats/c1/turns/stream', async (route) => {
    requests++;
    await route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('heading', { name: oneLine(LOGIN_COPY.title) }),
  ).toBeVisible();
  expect(requests).toBe(0);
});

test('새 브라우저 컨텍스트는 이전 컨텍스트의 동의를 공유하지 않는다', async ({
  page,
  browser,
}) => {
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => route.abort());
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const isolated = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });

  try {
    const fresh = await isolated.newPage();
    const { mockApi } = await import('../fixtures/api-mock');

    await mockApi(fresh);

    const generate = await prepareStoryGeneration(fresh);

    await expect(fresh.getByRole('dialog')).toHaveCount(0);
    await generate.click();
    await expect(
      fresh.getByRole('dialog').getByRole('heading', { name: COPY.title }),
    ).toBeVisible();
  } finally {
    await isolated.close();
  }
});

test('스토리라인 만들기에서만 동의를 받고 취소 시 입력 유지, 동의 시 한 번만 생성한다', async ({
  page,
}) => {
  const requests: unknown[] = [];

  await page.route('**/api/v1/stories/simple/storylines', (route) => {
    requests.push(route.request().postDataJSON());

    return route.fulfill({
      status: 201,
      json: {
        simpleCreationId: 1001,
        storylines: [
          {
            id: 101,
            storyline: '동의 후 생성한 스토리라인',
            recommendedInfos: [],
          },
        ],
      },
    });
  });

  const generate = await prepareStoryGeneration(page);

  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await generate.click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: COPY.title }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(generate).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`));
  await generate.click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: COPY.title }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await generate.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`));
  await expect(page.getByText('동의 후 생성한 스토리라인')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    genreTagIds: [1],
    protagonist: { featureTagIds: [2] },
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('동의 저장이 차단되면 현재 페이지에서만 유지하고 새로고침 뒤 다시 묻는다', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;

    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('blocked', 'SecurityError');

      original.call(this, name, value);
    };
  }, GUEST_CONSENT_STORAGE_KEY);
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => route.abort());
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      GUEST_CONSENT_STORAGE_KEY,
    ),
  ).toBeNull();
  await page.reload();
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: COPY.title }),
  ).toBeVisible();
});
