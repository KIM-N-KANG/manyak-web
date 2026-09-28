import type { Page } from '@playwright/test';

import { COLLAPSIBLE_LIST_ITEM_COPY } from '@/components/common/collapsible-list-item';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_COVER_COPY,
  GENERAL_STORY_DUPLICATE_NAME_ERROR,
  GENERAL_STORY_EVENT_COPY,
  GENERAL_STORY_START_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
} from '@/features/studio/general/constants';
import { DRAFT_IMAGE_FILE_ERROR } from '@/features/studio/general/utils/draft-image-file';
import { DISCARD_INPUT_CONFIRM_COPY } from '@/hooks/use-discard-confirm';

import { mockMemberSession } from '../fixtures/auth';
import { expect, skipOnboarding, test } from '../fixtures/test';

const UPLOAD_URL = 'https://upload.e2e.test/cover';
const OBJECT_KEY = 'thumbnails/uploaded/drafts/user-1/cover.png';
const COVER_FILE = {
  name: 'cover.png',
  mimeType: 'image/png',
  buffer: Buffer.from('cover-image-bytes'),
};

type PresignBody = { kind: string; contentType: string; contentLength: number };

/** presign과 S3 PUT을 목킹하고, 받은 요청을 기록한다. */
async function mockCoverUpload(page: Page, { putStatus = 200 } = {}) {
  const presignBodies: PresignBody[] = [];
  const putContentTypes: (string | undefined)[] = [];

  await page.route('**/api/v1/stories/images/presign', async (route) => {
    presignBodies.push(route.request().postDataJSON() as PresignBody);
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        uploadUrl: UPLOAD_URL,
        objectKey: OBJECT_KEY,
        expiresInSeconds: 600,
      }),
    });
  });
  await page.route(UPLOAD_URL, async (route) => {
    putContentTypes.push(route.request().headers()['content-type']);
    await route.fulfill({
      status: putStatus,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });

  return { presignBodies, putContentTypes };
}

async function openGeneralCreate(page: Page) {
  await skipOnboarding(page);
  await mockMemberSession(page);
  await page.goto(APP_PATH.STUDIO.STORY.GENERAL);
  await expect(
    page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label),
  ).toBeVisible();
}

test.describe('일반 제작 커버 이미지', () => {
  test('커버 이미지를 고르면 presign 후 바로 올리고, 삭제할 수 있다 (STORY-GENERAL-01)', async ({
    page,
  }) => {
    const { presignBodies, putContentTypes } = await mockCoverUpload(page);

    await openGeneralCreate(page);
    await page
      .getByLabel(GENERAL_STORY_COVER_COPY.label, { exact: true })
      .setInputFiles(COVER_FILE);

    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.change }),
    ).toBeVisible();
    expect(presignBodies).toEqual([
      {
        kind: 'COVER',
        contentType: 'image/png',
        contentLength: COVER_FILE.buffer.length,
      },
    ]);
    expect(putContentTypes).toEqual(['image/png']);

    await page
      .getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove })
      .click();
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toHaveCount(0);
  });

  test('받지 않는 형식은 올리지 않고 안내한다 (STORY-GENERAL-02)', async ({
    page,
  }) => {
    const { presignBodies } = await mockCoverUpload(page);

    await openGeneralCreate(page);
    await page
      .getByLabel(GENERAL_STORY_COVER_COPY.label, { exact: true })
      .setInputFiles({
        ...COVER_FILE,
        name: 'cover.gif',
        mimeType: 'image/gif',
      });

    await expect(page.getByText(DRAFT_IMAGE_FILE_ERROR.type)).toBeVisible();
    expect(presignBodies).toEqual([]);
  });

  test('업로드에 실패하면 안내하고 커버 이미지를 비워 둔다 (STORY-GENERAL-03)', async ({
    page,
  }) => {
    await mockCoverUpload(page, { putStatus: 403 });

    await openGeneralCreate(page);
    await page
      .getByLabel(GENERAL_STORY_COVER_COPY.label, { exact: true })
      .setInputFiles(COVER_FILE);

    await expect(
      page.getByText(TOAST_MESSAGE.DRAFT_IMAGE_UPLOAD_FAILED),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toHaveCount(0);
  });
});

test.describe('일반 제작 주변 인물', () => {
  test('1명으로 시작해 1명일 때는 삭제할 수 없고, 접은 상태는 탭을 바꿔도 남으며, 5명까지 추가한다 (STORY-GENERAL-07)', async ({
    page,
  }) => {
    const { addSupporting, supportingMaxCount } = GENERAL_STORY_CHARACTER_COPY;
    const { collapse, expand, remove } = COLLAPSIBLE_LIST_ITEM_COPY;
    const supportingTab = GENERAL_STORY_TABS.find(
      ({ value }) => value === 'supporting',
    );

    await openGeneralCreate(page);
    await page
      .getByRole('tab', { name: supportingTab?.label, exact: true })
      .click();

    const nameInputs = page.getByRole('textbox', {
      name: new RegExp(`^${supportingTab?.label} \\d+ 이름$`),
    });
    const removeButtons = page.getByRole('button', {
      name: new RegExp(`${remove}$`),
    });
    const addButton = page.getByRole('button', { name: addSupporting });

    await expect(nameInputs).toHaveCount(1);
    await expect(removeButtons).toHaveCount(0);

    await page
      .getByRole('button', { name: `${supportingTab?.label} 1 ${collapse}` })
      .click();
    await expect(nameInputs).toHaveCount(0);

    await page
      .getByRole('tab', { name: GENERAL_STORY_TABS[0].label, exact: true })
      .click();
    await page
      .getByRole('tab', { name: supportingTab?.label, exact: true })
      .click();
    await expect(nameInputs).toHaveCount(0);

    await page
      .getByRole('button', { name: `${supportingTab?.label} 1 ${expand}` })
      .click();
    await expect(nameInputs).toHaveCount(1);

    for (let count = 2; count <= supportingMaxCount; count += 1) {
      await addButton.click();
      await expect(nameInputs).toHaveCount(count);
    }

    await expect(addButton).toBeDisabled();
    await expect(removeButtons).toHaveCount(supportingMaxCount);

    await removeButtons.first().click();
    await expect(nameInputs).toHaveCount(supportingMaxCount - 1);
    await expect(addButton).toBeEnabled();
  });

  test('인물마다 이미지를 한 장 올리고 삭제할 수 있다 (STORY-GENERAL-08)', async ({
    page,
  }) => {
    const { presignBodies } = await mockCoverUpload(page);
    const supportingTab = GENERAL_STORY_TABS.find(
      ({ value }) => value === 'supporting',
    );
    const imageRemove = page.getByRole('button', {
      name: `${supportingTab?.label} 1 ${GENERAL_STORY_CHARACTER_COPY.imageLabel} ${GENERAL_STORY_COVER_COPY.remove}`,
    });

    await openGeneralCreate(page);
    await page
      .getByRole('tab', { name: supportingTab?.label, exact: true })
      .click();
    await page
      .getByLabel(GENERAL_STORY_CHARACTER_COPY.imageLabel, { exact: true })
      .setInputFiles(COVER_FILE);

    await expect(imageRemove).toBeVisible();
    expect(presignBodies).toEqual([
      {
        kind: 'CHARACTER',
        contentType: 'image/png',
        contentLength: COVER_FILE.buffer.length,
      },
    ]);

    await imageRemove.click();
    await expect(imageRemove).toHaveCount(0);
  });
});

test.describe('일반 제작 시작 상황 설정', () => {
  test('시작 상황은 1개로 시작해 칩으로 3개까지 추가·전환하고, 1개일 때는 지울 수 없으며, 엔딩은 3개까지이며 최소 턴 수는 50을 넘지 않는다 (STORY-GENERAL-10)', async ({
    page,
  }) => {
    const { defaultLabel, maxCount, add, remove, ending, name } =
      GENERAL_STORY_START_COPY;
    const startTab = GENERAL_STORY_TABS.find(({ value }) => value === 'start');
    const chips = page.locator('[data-slot=toggle-chip]');
    const addChip = page.getByRole('button', { name: add, exact: true });

    await openGeneralCreate(page);
    await page.getByRole('tab', { name: startTab?.label, exact: true }).click();

    await expect(chips).toHaveText([defaultLabel(1)]);
    await expect(
      page.getByRole('button', { name: `${defaultLabel(1)} ${remove}` }),
    ).toHaveCount(0);
    await page.getByLabel(name.label).fill('불 꺼진 승강장의 밤');
    await expect(chips).toHaveText(['불 꺼진 승강장…']);

    for (let count = 2; count <= maxCount; count += 1) {
      await addChip.click();
      await expect(chips).toHaveCount(count);
    }

    await expect(addChip).toBeDisabled();
    await expect(chips.last()).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('button', { name: `${defaultLabel(maxCount)} ${remove}` })
      .click();
    await expect(chips).toHaveCount(maxCount - 1);
    await expect(addChip).toBeEnabled();

    const addEnding = page.getByRole('button', { name: ending.add });

    for (let count = 1; count <= ending.maxCount; count += 1) {
      await addEnding.click();
    }

    await expect(addEnding).toBeDisabled();

    const minTurns = page.getByLabel(ending.minTurns.label).first();

    await minTurns.fill('99턴');
    await expect(minTurns).toHaveValue(String(ending.minTurns.max));
  });
});

test.describe('일반 제작 주요 사건', () => {
  test('0개로 시작해 10개까지 추가하고, 앞 사건과 이름이 겹치면 뒤 사건에 오류를 보이며, 빈 사건은 바로 지운다 (STORY-GENERAL-12)', async ({
    page,
  }) => {
    const { add, maxCount, name, defaultLabel } = GENERAL_STORY_EVENT_COPY;
    const eventTab = GENERAL_STORY_TABS.find(({ value }) => value === 'event');

    await openGeneralCreate(page);
    await page.getByRole('tab', { name: eventTab?.label, exact: true }).click();

    const nameInputs = page.getByRole('textbox', { name: name.label });
    const addButton = page.getByRole('button', { name: add });

    await expect(nameInputs).toHaveCount(0);

    for (let count = 1; count <= maxCount; count += 1) {
      await addButton.click();
      await expect(nameInputs).toHaveCount(count);
    }

    await expect(addButton).toBeDisabled();

    await nameInputs.nth(0).fill('도하람의 장부');
    await nameInputs.nth(1).fill(' 도하람의 장부 ');
    await expect(nameInputs.nth(0)).not.toHaveAttribute('aria-invalid');
    await expect(nameInputs.nth(1)).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText(GENERAL_STORY_DUPLICATE_NAME_ERROR),
    ).toHaveCount(1);

    await page
      .getByRole('button', {
        name: `${defaultLabel(maxCount)} ${COLLAPSIBLE_LIST_ITEM_COPY.remove}`,
      })
      .click();
    await expect(nameInputs).toHaveCount(maxCount - 1);
    await expect(addButton).toBeEnabled();
  });
});

test.describe('일반 제작 삭제 확인', () => {
  test('입력한 주변 인물·시작 상황은 확인 후 지우고, 빈 항목은 바로 지운다 (STORY-GENERAL-11)', async ({
    page,
  }) => {
    const { title, cancelLabel, confirmLabel } = DISCARD_INPUT_CONFIRM_COPY;
    const tabLabel = (value: string) =>
      GENERAL_STORY_TABS.find((tab) => tab.value === value)?.label;
    const dialog = page.getByRole('alertdialog');

    await openGeneralCreate(page);
    await page
      .getByRole('tab', { name: tabLabel('supporting'), exact: true })
      .click();

    const nameInputs = page.getByRole('textbox', {
      name: /^주변 인물 \d+ 이름$/,
    });
    const addCharacter = page.getByRole('button', {
      name: GENERAL_STORY_CHARACTER_COPY.addSupporting,
    });

    await addCharacter.click();
    await addCharacter.click();
    await nameInputs.nth(1).fill('하람');

    await page.getByRole('button', { name: '하람 삭제' }).click();
    await expect(dialog.getByText(title)).toBeVisible();
    await dialog.getByRole('button', { name: cancelLabel }).click();
    await expect(nameInputs).toHaveCount(3);

    await page.getByRole('button', { name: '주변 인물 3 삭제' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(nameInputs).toHaveCount(2);

    await page.getByRole('button', { name: '하람 삭제' }).click();
    await dialog.getByRole('button', { name: confirmLabel }).click();
    await expect(nameInputs).toHaveCount(1);

    await page
      .getByRole('tab', { name: tabLabel('start'), exact: true })
      .click();
    await page
      .getByRole('button', { name: GENERAL_STORY_START_COPY.add, exact: true })
      .click();
    await page.getByLabel(GENERAL_STORY_START_COPY.name.label).fill('역무실');
    await page.getByRole('button', { name: '역무실 삭제' }).click();
    await dialog.getByRole('button', { name: confirmLabel }).click();
    await expect(page.locator('[data-slot=toggle-chip]')).toHaveCount(1);
  });
});
