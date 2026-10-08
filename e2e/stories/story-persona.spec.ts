import type { Page } from '@playwright/test';

import type { UserPersonaResponse } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import {
  PERSONA_CREATE_COPY,
  PERSONA_CREATE_ERROR_COPY,
} from '@/features/my/personas/constants';
import { PERSONA_SELECT_COPY } from '@/features/stories/detail/constants/start-setting-copy';
import { buildChatStartSummary } from '@/features/stories/detail/utils/chat-start-summary';

import { mockMemberSession } from '../fixtures/auth';
import { oneLine } from '../fixtures/copy';
import { expect, test } from '../fixtures/test';

const STORY_DETAIL = '**/api/v1/stories/s1';
const PERSONAS = '**/api/v1/users/me/personas';
const CREATE_CHAT = '**/api/v1/chats';

const storyDetail = {
  id: 's1',
  title: '용의 계곡',
  startSettings: [
    {
      id: 'ss1',
      name: '계곡 입구',
      startSituation: '용의 흔적을 따라왔다',
      endings: [],
    },
  ],
};

const persona = (id: string, name: string): UserPersonaResponse => ({
  id,
  name,
  description: '# 주인공\n## 성별\n여성\n차분하다',
  createdAt: '2026-10-08T00:00:00Z',
  updatedAt: '2026-10-08T00:00:00Z',
});

const mockStoryDetail = (page: Page) =>
  page.route(STORY_DETAIL, (route) => route.fulfill({ json: storyDetail }));

/** 페르소나 목록 조회를 목킹하고 생성 요청 본문을 모은다. 생성에 성공하면 목록에 더한다. */
async function mockPersonas(
  page: Page,
  initial: UserPersonaResponse[],
  createStatus = 201,
) {
  const personas = [...initial];
  const createBodies: unknown[] = [];

  await page.route(PERSONAS, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();

      createBodies.push(body);

      if (createStatus !== 201) {
        await route.fulfill({ status: createStatus, json: {} });

        return;
      }

      const created = { ...persona('p-new', body.name), ...body };

      personas.unshift(created);
      await route.fulfill({ status: 201, json: created });

      return;
    }

    await route.fulfill({ json: personas });
  });

  return createBodies;
}

const personaSelect = (page: Page) =>
  page.getByRole('combobox', { name: PERSONA_SELECT_COPY.selectLabel });

test.describe('스토리 상세 페르소나 선택', () => {
  test('기본 주인공이 기본으로 선택되고, 고른 페르소나로 채팅을 만든다 (KNK-1469)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockStoryDetail(page);
    await mockPersonas(page, [persona('p1', '윤해솔')]);

    let createChatBody: Record<string, unknown> | undefined;

    await page.route(CREATE_CHAT, async (route) => {
      createChatBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: { id: 'c1', storyId: 's1', prologue: '프롤로그' },
      });
    });

    await page.goto(APP_PATH.STORY_DETAIL('s1'));

    await expect(personaSelect(page)).toContainText(
      PERSONA_SELECT_COPY.defaultProtagonist,
    );

    const startButton = page.getByRole('button', { name: '새 채팅 시작하기' });

    await expect(startButton).toContainText(
      buildChatStartSummary(
        PERSONA_SELECT_COPY.defaultProtagonist,
        '계곡 입구',
      ),
    );

    await page
      .getByRole('button', { name: `${PERSONA_SELECT_COPY.title} 안내` })
      .click();
    await expect(page.getByText(PERSONA_SELECT_COPY.info)).toBeVisible();
    await page.keyboard.press('Escape');

    await personaSelect(page).click();
    await expect(
      page.getByRole('option', { name: PERSONA_SELECT_COPY.create }),
    ).toBeVisible();
    await page.getByRole('option', { name: '윤해솔' }).click();
    await expect(personaSelect(page)).toContainText('윤해솔');
    await expect(startButton).toContainText(
      buildChatStartSummary('윤해솔', '계곡 입구'),
    );

    await startButton.click();

    await expect(page).toHaveURL(/\/chats\/c1$/);
    expect(createChatBody).toMatchObject({
      storyId: 's1',
      startSettingId: 'ss1',
      personaId: 'p1',
    });
  });

  test('기본 주인공으로 시작하면 페르소나 ID를 보내지 않는다 (KNK-1469)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockStoryDetail(page);
    await mockPersonas(page, [persona('p1', '윤해솔')]);

    let createChatBody: Record<string, unknown> | undefined;

    await page.route(CREATE_CHAT, async (route) => {
      createChatBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: { id: 'c1', storyId: 's1', prologue: '프롤로그' },
      });
    });

    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

    await expect(page).toHaveURL(/\/chats\/c1$/);
    expect(createChatBody?.personaId ?? null).toBeNull();
  });

  test('게스트가 페르소나 생성하기를 누르면 로그인 시트를 연다 (KNK-1469)', async ({
    page,
  }) => {
    await mockStoryDetail(page);

    let personaRequests = 0;

    await page.route(PERSONAS, async (route) => {
      personaRequests += 1;
      await route.fulfill({ json: [] });
    });

    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await personaSelect(page).click();
    await page
      .getByRole('option', { name: PERSONA_SELECT_COPY.create })
      .click();

    await expect(
      page.getByRole('dialog', { name: oneLine(LOGIN_COPY.title) }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.STORY_DETAIL('s1')}$`));

    await page.keyboard.press('Escape');
    await expect(personaSelect(page)).toContainText(
      PERSONA_SELECT_COPY.defaultProtagonist,
    );
    expect(personaRequests).toBe(0);
  });

  test('페르소나가 10개면 생성 화면으로 가지 않고 안내한다 (KNK-1469)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockStoryDetail(page);
    await mockPersonas(
      page,
      Array.from({ length: 10 }, (_, index) =>
        persona(`p${index}`, `페르소나${index}`),
      ),
    );

    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await personaSelect(page).click();
    await expect(page.getByRole('option', { name: '페르소나9' })).toBeVisible();
    await page
      .getByRole('option', { name: PERSONA_SELECT_COPY.create })
      .click();

    await expect(
      page.getByText(TOAST_MESSAGE.PERSONA_LIMIT_REACHED),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.STORY_DETAIL('s1')}$`));
  });
});

test.describe('페르소나 생성', () => {
  test('필수 입력을 채워 생성하면 상세로 돌아와 새 페르소나가 선택된다 (KNK-1469)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockStoryDetail(page);

    const createBodies = await mockPersonas(page, []);

    await page.goto(APP_PATH.STORY_DETAIL('s1'));
    await personaSelect(page).click();
    await page
      .getByRole('option', { name: PERSONA_SELECT_COPY.create })
      .click();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PERSONA_NEW}$`));
    await expect(
      page
        .getByRole('banner')
        .getByText(PERSONA_CREATE_COPY.headerTitle, { exact: true }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: PERSONA_CREATE_COPY.submit, exact: true })
      .click();

    await expect(page.getByText(PERSONA_CREATE_ERROR_COPY.name)).toBeVisible();
    await expect(
      page.getByText(PERSONA_CREATE_ERROR_COPY.feature),
    ).toBeVisible();
    expect(createBodies).toHaveLength(0);

    await page
      .getByRole('textbox', { name: PERSONA_CREATE_COPY.nameLabel })
      .fill('  윤해솔 ');
    await expect(
      page.getByText(PERSONA_CREATE_ERROR_COPY.gender),
    ).toBeVisible();
    await page
      .getByRole('combobox', { name: PERSONA_CREATE_COPY.genderLabel })
      .click();
    await page.getByRole('option', { name: '여성' }).click();
    await page
      .getByRole('textbox', { name: PERSONA_CREATE_COPY.featureLabel })
      .fill('## 성격\n차분하다');
    await page
      .getByRole('button', { name: PERSONA_CREATE_COPY.submit, exact: true })
      .click();

    await expect(page.getByText(TOAST_MESSAGE.PERSONA_CREATED)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.STORY_DETAIL('s1')}$`));
    expect(createBodies).toEqual([
      {
        name: '윤해솔',
        description: '# 주인공\n## 성별\n여성\n## 성격\n차분하다',
      },
    ]);

    // 돌아온 상세에서는 새 페르소나가 선택되어 있다
    await expect(personaSelect(page)).toContainText('윤해솔');
  });

  test('서버가 개수 상한으로 거절하면 상한 안내를 띄우고 머문다 (KNK-1469)', async ({
    page,
  }) => {
    await mockMemberSession(page);
    await mockPersonas(page, [], 409);

    await page.goto(APP_PATH.MY_PERSONA_NEW);
    await page
      .getByRole('textbox', { name: PERSONA_CREATE_COPY.nameLabel })
      .fill('윤해솔');
    await page
      .getByRole('combobox', { name: PERSONA_CREATE_COPY.genderLabel })
      .click();
    await page.getByRole('option', { name: '남성' }).click();
    await page
      .getByRole('textbox', { name: PERSONA_CREATE_COPY.featureLabel })
      .fill('차분하다');
    await page
      .getByRole('button', { name: PERSONA_CREATE_COPY.submit, exact: true })
      .click();

    await expect(
      page.getByText(TOAST_MESSAGE.PERSONA_LIMIT_REACHED),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PERSONA_NEW}$`));
  });

  test('게스트가 생성 화면에 들어오면 로그인 화면으로 보낸다 (KNK-1469)', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MY_PERSONA_NEW);

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}$`));
  });
});
