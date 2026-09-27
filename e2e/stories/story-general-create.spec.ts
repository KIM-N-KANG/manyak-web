import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_COVER_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
} from '@/features/studio/general/constants';
import { DRAFT_IMAGE_FILE_ERROR } from '@/features/studio/general/utils/draft-image-file';

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
  test('1명으로 시작해 1명일 때는 삭제할 수 없고, 5명까지 추가한다 (STORY-GENERAL-07)', async ({
    page,
  }) => {
    const { addSupporting, remove, supportingMaxCount } =
      GENERAL_STORY_CHARACTER_COPY;
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
