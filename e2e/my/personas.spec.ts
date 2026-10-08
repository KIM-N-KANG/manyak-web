import type { Page } from '@playwright/test';

import type { UserPersonaResponse } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { PERSONA_MENU_COPY } from '@/features/my/_shared/constants/persona';
import {
  PERSONA_CREATE_COPY,
  PERSONA_EDIT_COPY,
  PERSONA_LIST_COPY,
} from '@/features/my/personas/constants';

import { mockMemberSession } from '../fixtures/auth';
import { expect, skipOnboarding, test } from '../fixtures/test';

const PERSONAS = '**/api/v1/users/me/personas';
const PERSONA = '**/api/v1/users/me/personas/*';

const persona = (
  id: string,
  name: string,
  description = '# 주인공\n## 성별\n여성\n## 성격\n겁이 많지만 끈질기다',
): UserPersonaResponse => ({
  id,
  name,
  description,
  createdAt: '2026-10-08T00:00:00Z',
  updatedAt: '2026-10-08T00:00:00Z',
});

/** 목록 조회와 수정, 삭제를 목킹하고 받은 요청을 모은다. 수정과 삭제는 목록에 반영한다. */
async function mockPersonaApi(page: Page, initial: UserPersonaResponse[]) {
  let personas = [...initial];
  const requests: { method: string; id: string; body: unknown }[] = [];

  await page.route(PERSONAS, (route) => route.fulfill({ json: personas }));
  await page.route(PERSONA, async (route) => {
    const request = route.request();
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';

    requests.push({
      method: request.method(),
      id,
      body: request.postDataJSON(),
    });

    if (request.method() === 'DELETE') {
      personas = personas.filter((item) => item.id !== id);
      await route.fulfill({ status: 204 });

      return;
    }

    const updated = { ...persona(id, ''), ...request.postDataJSON() };

    personas = personas.map((item) => (item.id === id ? updated : item));
    await route.fulfill({ json: updated });
  });

  return requests;
}

async function openPersonaList(page: Page) {
  await skipOnboarding(page);
  await mockMemberSession(page);
  await page.goto(APP_PATH.MAIN.MY);
  await page.getByRole('link', { name: PERSONA_MENU_COPY.menuLabel }).click();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PERSONAS}$`));
}

const openOptions = (page: Page, name: string) =>
  page
    .getByRole('button', { name: PERSONA_LIST_COPY.optionsTrigger(name) })
    .click();

test.describe('페르소나 관리', () => {
  test('마이에서 들어가 내 페르소나 이름과 특징을 보고, 없으면 빈 안내를 본다 (KNK-1469)', async ({
    page,
  }) => {
    await mockPersonaApi(page, [
      persona('p1', '윤해솔'),
      persona('p2', '강태오', '자유롭게 쓴 소개'),
    ]);
    await openPersonaList(page);

    const list = page.getByRole('list', {
      name: PERSONA_LIST_COPY.headerTitle,
    });

    await expect(list.getByRole('listitem')).toHaveCount(2);
    await expect(list.getByText('윤해솔')).toBeVisible();
    await expect(list.getByText('겁이 많지만 끈질기다')).toBeVisible();
    await expect(list.getByText(/##/)).toHaveCount(0);
    await expect(list.getByText('자유롭게 쓴 소개')).toBeVisible();

    await page.unroute(PERSONAS);
    await page.route(PERSONAS, (route) => route.fulfill({ json: [] }));
    await page.reload();
    await expect(page.getByText(PERSONA_LIST_COPY.empty)).toBeVisible();
    await expect(
      page.getByRole('button', { name: PERSONA_LIST_COPY.create, exact: true }),
    ).toBeVisible();
  });

  test('옵션 시트에서 수정하면 기존 값을 채운 폼으로 저장하고 목록으로 돌아온다 (KNK-1469)', async ({
    page,
  }) => {
    const requests = await mockPersonaApi(page, [persona('p1', '윤해솔')]);

    await openPersonaList(page);
    await openOptions(page, '윤해솔');
    await page.getByRole('menuitem', { name: PERSONA_LIST_COPY.edit }).click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.MY_PERSONA_EDIT('p1')}$`),
    );
    await expect(page.getByText(PERSONA_EDIT_COPY.description)).toBeVisible();

    const name = page.getByRole('textbox', {
      name: PERSONA_CREATE_COPY.nameLabel,
    });
    const feature = page.getByRole('textbox', {
      name: PERSONA_CREATE_COPY.featureLabel,
    });

    await expect(name).toHaveValue('윤해솔');
    await expect(
      page.getByRole('combobox', { name: PERSONA_CREATE_COPY.genderLabel }),
    ).toContainText('여성');
    await expect(feature).toHaveValue('## 성격\n겁이 많지만 끈질기다');

    await name.fill('윤해담');
    await page
      .getByRole('button', { name: PERSONA_EDIT_COPY.submit, exact: true })
      .click();

    await expect(page.getByText(TOAST_MESSAGE.PERSONA_UPDATED)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PERSONAS}$`));
    await expect(page.getByText('윤해담')).toBeVisible();
    expect(requests).toEqual([
      {
        method: 'PATCH',
        id: 'p1',
        body: {
          name: '윤해담',
          description: '# 주인공\n## 성별\n여성\n## 성격\n겁이 많지만 끈질기다',
        },
      },
    ]);
  });

  test('옵션 시트에서 삭제를 확인하면 목록에서 지운다 (KNK-1469)', async ({
    page,
  }) => {
    const requests = await mockPersonaApi(page, [
      persona('p1', '윤해솔'),
      persona('p2', '강태오'),
    ]);

    await openPersonaList(page);
    await openOptions(page, '윤해솔');
    await page
      .getByRole('menuitem', { name: PERSONA_LIST_COPY.delete })
      .click();

    const dialog = page.getByRole('alertdialog', {
      name: PERSONA_LIST_COPY.deleteConfirmTitle,
    });

    await expect(
      dialog.getByText(PERSONA_LIST_COPY.deleteConfirmDescription),
    ).toBeVisible();
    await dialog
      .getByRole('button', { name: PERSONA_LIST_COPY.delete })
      .click();

    await expect(page.getByText(TOAST_MESSAGE.PERSONA_DELETED)).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByText('강태오')).toBeVisible();
    expect(requests).toEqual([{ method: 'DELETE', id: 'p1', body: null }]);
  });

  test('페르소나가 10개면 생성 화면으로 가지 않고 안내한다 (KNK-1469)', async ({
    page,
  }) => {
    await mockPersonaApi(
      page,
      Array.from({ length: 10 }, (_, index) =>
        persona(`p${index}`, `페르소나${index}`),
      ),
    );
    await openPersonaList(page);
    await expect(page.getByRole('listitem')).toHaveCount(10);
    await page
      .getByRole('button', { name: PERSONA_LIST_COPY.create, exact: true })
      .click();

    await expect(
      page.getByText(TOAST_MESSAGE.PERSONA_LIMIT_REACHED),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PERSONAS}$`));
  });

  test('게스트가 관리 화면에 들어오면 로그인 화면으로 보낸다 (KNK-1469)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto(APP_PATH.MY_PERSONAS);

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}$`));
  });
});
