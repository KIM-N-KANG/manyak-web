import { API_ERROR_CODE } from '@/constants/api-error-code';
import { APP_PATH } from '@/constants/app-path';
import { CONSENT_SHEET_COPY } from '@/features/auth/_shared/constants/consent';
import { GUEST_CONSENT_COPY as COPY } from '@/features/auth/_shared/constants/guest-consent';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { CHAT_TOUR_SEEN_STORAGE_KEY } from '@/features/chats/room/constants';

import { oneLine } from '../fixtures/copy';
import { prepareStoryGeneration } from '../fixtures/story-generation';
import {
  EXHAUSTED_TRIALS,
  expect,
  GUEST_CONSENT_VERSION_FIXTURE,
  mockGuestConsents,
  mockMemberSession,
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

test('조회 오류와 필드 누락은 전송을 막고 재조회 후 동의받는다', async ({
  page,
}) => {
  let reads = 0;
  let writes = 0;
  let turns = 0;

  await page.route('**/api/v1/guests/consents', (route) => {
    if (route.request().method() === 'POST') writes++;

    reads++;

    return route.fulfill(
      reads === 1
        ? { status: 500, json: {} }
        : reads === 2
          ? { json: { guestPrivacy: { needsConsent: false } } }
          : {
              json: {
                guestPrivacy: {
                  requiredVersion: GUEST_CONSENT_VERSION_FIXTURE,
                  needsConsent: true,
                },
              },
            },
    );
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => {
    turns++;

    return route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();

  const sheet = page.getByRole('dialog');
  const retry = sheet.getByRole('button', {
    name: CONSENT_SHEET_COPY.retry,
    exact: true,
  });

  await expect(sheet.getByRole('alert')).toHaveText(
    CONSENT_SHEET_COPY.loadError.title,
  );
  await retry.click();
  await expect.poll(() => reads).toBe(2);
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(
    sheet.getByRole('button', { name: COPY.agree, exact: true }),
  ).toBeEnabled();
  expect(writes).toBe(0);
  expect(turns).toBe(0);
});

test('저장 실패는 입력을 유지하고 성공 응답 전에는 전송하지 않는다', async ({
  page,
}) => {
  let writes = 0;
  let turns = 0;
  let complete!: () => void;
  const wait = new Promise<void>((resolve) => {
    complete = resolve;
  });

  await page.route('**/api/v1/guests/consents', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fallback();

      return;
    }

    writes++;

    if (writes === 1) {
      await route.fulfill({ status: 500, json: {} });

      return;
    }

    await wait;
    await route.fulfill({
      json: {
        guestPrivacy: {
          requiredVersion: GUEST_CONSENT_VERSION_FIXTURE,
          needsConsent: false,
        },
      },
    });
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => {
    turns++;

    return route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));

  const input = page.getByPlaceholder('이야기를 어떻게 이어갈까요?');

  await input.fill('저장 후에만 전송');
  await page.getByRole('button', { name: '전송', exact: true }).click();

  const agree = page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true });

  await agree.click();
  await expect(page.getByRole('alert')).toHaveText(
    CONSENT_SHEET_COPY.error.retryable,
  );
  await expect(input).toHaveValue('저장 후에만 전송');
  expect(turns).toBe(0);
  await agree.click();
  await expect.poll(() => writes).toBe(2);
  await expect(
    page.getByRole('dialog').getByRole('button', {
      name: CONSENT_SHEET_COPY.submitPending,
      exact: true,
    }),
  ).toBeDisabled();
  expect(turns).toBe(0);
  complete();
  await expect.poll(() => turns).toBe(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(writes).toBe(2);
});

test('버전 충돌은 최신 상태를 다시 조회하고 명시적으로 다시 동의해야 저장한다', async ({
  page,
}) => {
  const versions: string[] = [];
  let reads = 0;
  let turns = 0;

  await page.route('**/api/v1/guests/consents', async (route) => {
    if (route.request().method() === 'GET') {
      reads++;
      await route.fulfill({
        json: {
          guestPrivacy: {
            requiredVersion: reads === 1 ? 'guest-v1' : 'guest-v2',
            needsConsent: true,
          },
        },
      });
    } else {
      versions.push(route.request().postDataJSON().guestPrivacy);
      await route.fulfill(
        versions.length === 1
          ? {
              status: 400,
              json: { code: API_ERROR_CODE.CONSENT_VERSION_MISMATCH },
            }
          : {
              json: {
                guestPrivacy: {
                  requiredVersion: 'guest-v2',
                  needsConsent: false,
                },
              },
            },
      );
    }
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => {
    turns++;

    return route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();

  const sheet = page.getByRole('dialog');
  const agree = sheet.getByRole('button', { name: COPY.agree, exact: true });

  await agree.click();
  await expect(sheet.getByRole('alert')).toHaveText(
    CONSENT_SHEET_COPY.error.versionMismatch,
  );
  await expect(
    sheet.getByRole('heading', { name: COPY.detailTitle }),
  ).toBeVisible();
  await expect.poll(() => reads).toBe(2);
  await expect(agree).toBeEnabled();
  expect(versions).toEqual(['guest-v1']);
  expect(turns).toBe(0);
  await agree.click();
  await expect.poll(() => turns).toBe(1);
  expect(versions).toEqual(['guest-v1', 'guest-v2']);
});

test('저장 중 취소하면 늦게 성공해도 원래 요청을 재개하지 않는다', async ({
  page,
}) => {
  let started = false;
  let replied = false;
  let turns = 0;
  let complete!: () => void;
  const wait = new Promise<void>((resolve) => {
    complete = resolve;
  });

  await page.route('**/api/v1/guests/consents', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fallback();

      return;
    }

    started = true;
    await wait;
    await route.fulfill({
      json: {
        guestPrivacy: {
          requiredVersion: GUEST_CONSENT_VERSION_FIXTURE,
          needsConsent: false,
        },
      },
    });
    replied = true;
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => {
    turns++;

    return route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));

  const input = page.getByPlaceholder('이야기를 어떻게 이어갈까요?');

  await input.fill('취소한 메시지');
  await page.getByRole('button', { name: '전송', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: COPY.agree, exact: true })
    .click();
  await expect.poll(() => started).toBe(true);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  complete();
  await expect.poll(() => replied).toBe(true);
  await expect(input).toHaveValue('취소한 메시지');
  expect(turns).toBe(0);
});

test('회원은 게스트 동의 API를 호출하지 않는다', async ({ page }) => {
  await mockMemberSession(page);

  let requests = 0;
  let turns = 0;

  await page.route('**/api/v1/guests/consents', (route) => {
    requests++;

    return route.abort();
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => {
    turns++;

    return route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await expect.poll(() => turns).toBe(1);
  expect(requests).toBe(0);
});

test('저장 응답이 동의 완료를 확인하지 못하면 전송하지 않는다', async ({
  page,
}) => {
  let turns = 0;

  await page.route('**/api/v1/guests/consents', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fallback();

      return;
    }

    await route.fulfill({ json: {} });
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => {
    turns++;

    return route.abort();
  });
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();

  const sheet = page.getByRole('dialog');

  await sheet.getByRole('button', { name: COPY.agree, exact: true }).click();
  await expect(sheet.getByRole('alert')).toHaveText(
    CONSENT_SHEET_COPY.error.retryable,
  );
  expect(turns).toBe(0);
});

test('상세와 한 줄 제목을 확인하고 동의하면 원래 메시지를 한 번만 전송한다', async ({
  page,
}) => {
  const bodies: unknown[] = [];
  const consentRequests: {
    method: string;
    body: unknown;
    deviceId?: string;
  }[] = [];

  page.on('request', (request) => {
    if (request.url().endsWith('/api/v1/guests/consents')) {
      consentRequests.push({
        method: request.method(),
        body: request.postDataJSON(),
        deviceId: request.headers()['x-manyak-device-id'],
      });
    }
  });

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
  expect(consentRequests.map(({ method }) => method)).toEqual(['GET', 'POST']);
  expect(consentRequests[1].body).toEqual({
    guestPrivacy: GUEST_CONSENT_VERSION_FIXTURE,
  });
  expect(consentRequests[0].deviceId).toBeTruthy();
  expect(consentRequests[1].deviceId).toBe(consentRequests[0].deviceId);
  await expect(page).toHaveURL(/\/chats\/c1$/);

  await page.reload();
  await input.fill('다음 이야기');
  await page.getByRole('button', { name: '전송', exact: true }).click();
  await expect.poll(() => bodies.length).toBe(2);
  await expect(sheet).toHaveCount(0);
  expect(consentRequests.map(({ method }) => method)).toEqual([
    'GET',
    'POST',
    'GET',
  ]);
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

test('제작 동의 후에는 채팅에서 다시 묻지 않고 서버가 재동의를 요구하면 다시 묻는다', async ({
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
  await mockGuestConsents(page);
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

test('기존 브라우저 동의 기록이 있어도 서버가 미동의면 다시 묻는다', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'manyak:guest-consent',
      JSON.stringify({
        version: '2026-09-20-v1',
        acceptedAt: '2026-09-20T00:00:00.000Z',
      }),
    );
  });
  await page.route('**/api/v1/chats/c1/turns/stream', (route) => route.abort());
  await page.goto(APP_PATH.CHAT_ROOM('c1'));
  await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: COPY.title }),
  ).toBeVisible();
});

test('첫 진입에는 전송 전에 투어가 먼저 뜨고, 투어를 닫고 보낸 전송의 동의 시트에는 투어가 겹치지 않는다', async ({
  page,
}) => {
  // beforeEach의 투어 열람 표시를 지워 첫 진입 자동 노출 조건을 만든다.
  await page.addInitScript(
    (key) => localStorage.removeItem(key),
    CHAT_TOUR_SEEN_STORAGE_KEY,
  );
  await page.route('**/api/v1/chats/c1/turns/stream', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: 'event: done\ndata: {}\n\n',
    }),
  );
  await page.goto(APP_PATH.CHAT_ROOM('c1'));

  const tour = page.getByRole('dialog', { name: '채팅 화면 안내' });

  // 화면이 준비되면 사용자가 아무것도 보내기 전에 투어가 먼저 열린다.
  await expect(tour).toBeVisible();
  await tour.getByRole('button', { name: '건너뛰기' }).click();
  await expect(tour).toHaveCount(0);

  await page.getByPlaceholder('이야기를 어떻게 이어갈까요?').fill('문을 연다');
  await page.getByRole('button', { name: '전송', exact: true }).click();

  const sheet = page.getByRole('dialog', { name: COPY.title });

  await expect(sheet).toBeVisible();
  await expect(tour).toHaveCount(0);

  await sheet.getByRole('button', { name: COPY.agree, exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(tour).toHaveCount(0);
});
