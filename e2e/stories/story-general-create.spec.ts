import type { Page } from '@playwright/test';

import { COLLAPSIBLE_LIST_ITEM_COPY } from '@/components/common/collapsible-list-item';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { DRAFT_SAVE_BUTTON_LABEL } from '@/features/stories/_shared/components/draft-save-button';
import { DRAFT_EXIT_WARNING_COPY } from '@/features/stories/_shared/constants/draft-exit-warning';
import { PENDING_CREATION_REQUEST_STORAGE_KEY } from '@/features/stories/_shared/utils/creation-request-storage';
import {
  GENERAL_STORY_CHARACTER_COPY,
  GENERAL_STORY_COVER_COPY,
  GENERAL_STORY_CREATE_COPY,
  GENERAL_STORY_DUPLICATE_NAME_ERROR,
  GENERAL_STORY_EVENT_COPY,
  GENERAL_STORY_IMAGE_CROP_COPY,
  GENERAL_STORY_REGISTER_ERROR_COPY,
  GENERAL_STORY_REVIEW_COPY,
  GENERAL_STORY_START_COPY,
  GENERAL_STORY_TABS,
  GENERAL_STORY_TEXT_FIELDS,
} from '@/features/studio/general/constants';
import { DRAFT_IMAGE_FILE_ERROR } from '@/features/studio/general/utils/draft-image-file';
import {
  getMinLengthError,
  getRequiredError,
} from '@/features/studio/general/utils/general-story-text-error';
import { CREATION_PROGRESS_CARD_COPY } from '@/features/studio/menu/constants';
import { STORY_MODE_SELECT_COPY } from '@/features/studio/story/constants';
import { DISCARD_INPUT_CONFIRM_COPY } from '@/hooks/use-discard-confirm';

import { mockGuestSession, mockMemberSession } from '../fixtures/auth';
import { oneLine } from '../fixtures/copy';
import { readCreationStorage } from '../fixtures/storage';
import { expect, skipOnboarding, test } from '../fixtures/test';

const UPLOAD_URL = 'https://upload.e2e.test/cover';
const OBJECT_KEY = 'thumbnails/uploaded/drafts/user-1/cover.png';
/** 자르기 시트가 디코딩할 수 있는 60x60 정상 PNG다. */
const COVER_FILE = {
  name: 'cover.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAJElEQVR4nO3BMQEAAADCoPVP7WkJoAAAAAAAAAAAAAAAAAAAbjh8AAFOgZ4bAAAAAElFTkSuQmCC',
    'base64',
  ),
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

/** 열린 자르기 시트에서 기본 영역(가운데)으로 자른다. */
async function confirmCrop(page: Page) {
  const sheet = page.getByRole('dialog', {
    name: GENERAL_STORY_IMAGE_CROP_COPY.title,
  });

  await sheet
    .getByRole('button', { name: GENERAL_STORY_IMAGE_CROP_COPY.confirm })
    .click();
  await expect(sheet).toHaveCount(0);
}

/** 올린 이미지(blob 미리보기 한 장)의 실제 가로/세로 비율을 반환한다. */
async function readPreviewRatio(page: Page) {
  const preview = page.locator('img[src^="blob:"]');

  await expect
    .poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  return preview.evaluate(
    (img: HTMLImageElement) => img.naturalWidth / img.naturalHeight,
  );
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
    await confirmCrop(page);

    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.change }),
    ).toBeVisible();
    expect(presignBodies).toEqual([
      {
        kind: 'COVER',
        contentType: 'image/jpeg',
        contentLength: expect.any(Number),
      },
    ]);
    expect(putContentTypes).toEqual(['image/jpeg']);
    expect(await readPreviewRatio(page)).toBeCloseTo(3 / 4, 1);

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
    await confirmCrop(page);

    await expect(
      page.getByText(TOAST_MESSAGE.DRAFT_IMAGE_UPLOAD_FAILED),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toHaveCount(0);
  });

  test('자르기 시트를 닫으면 올리지 않고 커버 이미지를 그대로 둔다 (STORY-GENERAL-29)', async ({
    page,
  }) => {
    const { presignBodies } = await mockCoverUpload(page);
    const sheet = page.getByRole('dialog', {
      name: GENERAL_STORY_IMAGE_CROP_COPY.title,
    });

    await openGeneralCreate(page);
    await page
      .getByLabel(GENERAL_STORY_COVER_COPY.label, { exact: true })
      .setInputFiles(COVER_FILE);
    await expect(
      sheet.getByRole('slider', { name: GENERAL_STORY_IMAGE_CROP_COPY.zoom }),
    ).toBeVisible();
    await sheet
      .getByRole('button', { name: GENERAL_STORY_IMAGE_CROP_COPY.close })
      .click();

    await expect(sheet).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toHaveCount(0);
    expect(presignBodies).toEqual([]);
  });
});

test.describe('일반 제작 최소 글자 수', () => {
  test('글 입력에 한 글자만 쓰고 칸을 벗어나면 설명 대신 최소 글자 수 오류를 보이고, 2자가 되면 설명으로 돌아간다 (STORY-GENERAL-04)', async ({
    page,
  }) => {
    const tabLabel = (value: string) =>
      GENERAL_STORY_TABS.find((tab) => tab.value === value)?.label;
    const { title } = GENERAL_STORY_TEXT_FIELDS;
    const { featureLabel } = GENERAL_STORY_CHARACTER_COPY;
    const { suggestedInput } = GENERAL_STORY_START_COPY;

    await openGeneralCreate(page);

    const titleInput = page.getByLabel(title.label);
    const titleError = page.getByText(getMinLengthError(title.label, '역')!);

    await titleInput.fill('역');
    await titleInput.blur();
    await expect(titleError).toBeVisible();
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    await titleInput.fill('역사');
    await expect(titleError).toHaveCount(0);
    await expect(page.getByText(title.description)).toBeVisible();

    await page
      .getByRole('tab', { name: tabLabel('protagonist'), exact: true })
      .click();

    const feature = page.getByLabel(featureLabel);

    await feature.fill('역');
    await feature.blur();
    await expect(feature).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText(getMinLengthError(featureLabel, '역')!),
    ).toBeVisible();

    await page
      .getByRole('tab', { name: tabLabel('start'), exact: true })
      .click();

    const firstSuggestedInput = page.getByRole('textbox', {
      name: `${suggestedInput.label} 1`,
    });

    await firstSuggestedInput.fill('역');
    await firstSuggestedInput.blur();
    await expect(firstSuggestedInput).toHaveAttribute('aria-invalid', 'true');
    await expect(
      page.getByText(getMinLengthError(suggestedInput.label, '역')!),
    ).toBeVisible();
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
    await confirmCrop(page);

    await expect(imageRemove).toBeVisible();
    expect(presignBodies).toEqual([
      {
        kind: 'CHARACTER',
        contentType: 'image/jpeg',
        contentLength: expect.any(Number),
      },
    ]);
    expect(await readPreviewRatio(page)).toBeCloseTo(4 / 3, 1);

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

test.describe('일반 제작 이름 중복', () => {
  test('주인공과 겹친 주변 인물, 같은 시작 상황에서 겹친 엔딩은 뒤 항목 이름 칸에 오류를 보인다 (STORY-GENERAL-13)', async ({
    page,
  }) => {
    const tabLabel = (value: string) =>
      GENERAL_STORY_TABS.find((tab) => tab.value === value)?.label;
    const duplicateError = page.getByText(GENERAL_STORY_DUPLICATE_NAME_ERROR);
    const { ending } = GENERAL_STORY_START_COPY;

    await openGeneralCreate(page);
    await page
      .getByRole('tab', { name: tabLabel('protagonist'), exact: true })
      .click();
    await page.getByRole('textbox', { name: '주인공 이름' }).fill('윤해솔');
    await page
      .getByRole('tab', { name: tabLabel('supporting'), exact: true })
      .click();

    const supportingName = page.getByRole('textbox', {
      name: `${tabLabel('supporting')} 1 이름`,
    });

    await supportingName.fill('윤해솔');
    await expect(supportingName).toHaveAttribute('aria-invalid', 'true');
    await expect(duplicateError).toHaveCount(1);
    await supportingName.fill('도하람');
    await expect(duplicateError).toHaveCount(0);

    await page
      .getByRole('tab', { name: tabLabel('start'), exact: true })
      .click();

    const addEnding = page.getByRole('button', { name: ending.add });

    await addEnding.click();
    await addEnding.click();

    const endingNames = page.getByRole('textbox', { name: ending.name.label });

    await endingNames.nth(0).fill('첫차');
    await endingNames.nth(1).fill('첫차');
    await expect(endingNames.nth(0)).not.toHaveAttribute('aria-invalid');
    await expect(endingNames.nth(1)).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('일반 제작 하단 버튼과 등록 탭', () => {
  test('프로필 탭은 다음만, 가운데 탭은 이전과 다음, 등록 탭은 이전과 켜진 등록하기를 두고, 장르는 키워드를 고르거나 직접 추가한다 (STORY-GENERAL-14)', async ({
    page,
  }) => {
    await page.route('**/api/v1/stories/simple/tags', (route) =>
      route.fulfill({
        json: [
          { id: 1, name: '판타지', category: 'GENRE' },
          { id: 2, name: '용감한', category: 'PROTAGONIST' },
        ],
      }),
    );

    const { previous, next, register } = GENERAL_STORY_CREATE_COPY;
    const footerButton = (name: string) =>
      page.getByRole('button', { name, exact: true });
    const tab = (index: number) =>
      page.getByRole('tab', {
        name: GENERAL_STORY_TABS.at(index)?.label,
        exact: true,
      });

    await openGeneralCreate(page);
    await expect(footerButton(previous)).toHaveCount(0);
    await footerButton(next).click();
    await expect(tab(1)).toHaveAttribute('aria-selected', 'true');
    await footerButton(previous).click();
    await expect(tab(0)).toHaveAttribute('aria-selected', 'true');

    await tab(-1).click();
    await expect(footerButton(next)).toHaveCount(0);
    await expect(footerButton(previous)).toBeVisible();
    await expect(footerButton(register)).toBeEnabled();

    const fantasy = page.getByRole('button', { name: '판타지', exact: true });

    await fantasy.click();
    await expect(fantasy).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: '용감한', exact: true }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: '키워드 추가' }).click();

    const dialog = page.getByRole('dialog');

    await dialog.getByRole('textbox').fill('유실물');
    await dialog.getByRole('button', { name: '추가하기' }).click();
    await expect(
      page.getByRole('button', { name: '유실물', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('일반 제작 등록 오류 표시', () => {
  test('등록하기를 누르면 덜 채운 탭 이름과 칸에 오류를 보이고, 첫 오류 탭으로 옮기며, 접힌 항목을 펼친다 (STORY-GENERAL-15)', async ({
    page,
  }) => {
    const tab = (value: string) =>
      page.getByRole('tab', {
        name: new RegExp(
          `^${GENERAL_STORY_TABS.find((item) => item.value === value)?.label}`,
        ),
      });
    const { title, oneLineIntro } = GENERAL_STORY_TEXT_FIELDS;
    const supportingLabel = GENERAL_STORY_TABS.find(
      ({ value }) => value === 'supporting',
    )?.label;

    await openGeneralCreate(page);
    await page.getByLabel(title.label).fill('노선도에 없는 역');
    await tab('supporting').click();
    await page
      .getByRole('button', {
        name: `${supportingLabel} 1 ${COLLAPSIBLE_LIST_ITEM_COPY.collapse}`,
      })
      .click();
    await tab('publish').click();
    await page
      .getByRole('button', {
        name: GENERAL_STORY_CREATE_COPY.register,
        exact: true,
      })
      .click();

    await expect(tab('basic')).toHaveAttribute('aria-selected', 'true');
    await expect(tab('basic')).toHaveAttribute('data-invalid');
    await expect(tab('event')).not.toHaveAttribute('data-invalid');
    await expect(page.getByLabel(oneLineIntro.label)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(
      page.getByText(getRequiredError(oneLineIntro.label)),
    ).toBeVisible();

    await page.getByLabel(oneLineIntro.label).fill('막차에서 내린 곳');
    await expect(
      page.getByText(getRequiredError(oneLineIntro.label)),
    ).toHaveCount(0);

    await tab('supporting').click();
    await expect(
      page.getByRole('textbox', { name: `${supportingLabel} 1 이름` }),
    ).toHaveAttribute('aria-invalid', 'true');

    await tab('publish').click();
    await expect(
      page.getByText(GENERAL_STORY_REGISTER_ERROR_COPY.genre),
    ).toBeVisible();
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

test.describe('일반 제작 임시 저장', () => {
  const saveButton = (page: Page) =>
    page.getByRole('button', {
      name: DRAFT_SAVE_BUTTON_LABEL,
      exact: true,
    });
  const savedToast = (page: Page) =>
    page.getByText(TOAST_MESSAGE.STORY_DRAFT_SAVED);
  /** 버튼 없이 저장되는 경우(탭 이동·화면 숨김)는 IndexedDB에 들어갈 때까지 기다린다. */
  const waitForSavedDraft = (page: Page, text: string) =>
    expect
      .poll(() =>
        readCreationStorage(page, PENDING_CREATION_REQUEST_STORAGE_KEY),
      )
      .toContain(text);
  const draftCard = (page: Page) =>
    page.getByRole('article', { name: CREATION_PROGRESS_CARD_COPY.draftTitle });

  test('표지·제목·한 줄 소개를 넣고 탭을 옮기면 임시 저장되고, 제작 탭 카드에 보이며 이어서 만든다 (STORY-GENERAL-16)', async ({
    page,
  }) => {
    await mockCoverUpload(page);
    await openGeneralCreate(page);
    await page
      .getByLabel(GENERAL_STORY_COVER_COPY.label, { exact: true })
      .setInputFiles(COVER_FILE);
    await confirmCrop(page);
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toBeVisible();
    await page
      .getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label)
      .fill('노선도에 없는 역');
    await page
      .getByLabel(GENERAL_STORY_TEXT_FIELDS.oneLineIntro.label)
      .fill('막차에서 내린 곳은 존재하지 않는 역이었다');
    await page.getByRole('tab', { name: GENERAL_STORY_TABS[1].label }).click();
    await waitForSavedDraft(page, '노선도에 없는 역');

    await page
      .getByRole('button', { name: GENERAL_STORY_CREATE_COPY.close })
      .click();

    const exitDialog = page.getByRole('alertdialog');

    await expect(
      exitDialog.getByText(DRAFT_EXIT_WARNING_COPY.saved.title),
    ).toBeVisible();
    await exitDialog
      .getByRole('button', {
        name: DRAFT_EXIT_WARNING_COPY.saved.confirm,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    const card = draftCard(page);

    await expect(card.getByText('노선도에 없는 역')).toBeVisible();
    await expect(
      card.getByText('막차에서 내린 곳은 존재하지 않는 역이었다'),
    ).toBeVisible();
    await expect(card.locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(card.locator('time')).toBeVisible();

    await card
      .getByRole('button', { name: CREATION_PROGRESS_CARD_COPY.resume })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.GENERAL}$`),
    );
    await expect(
      page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label),
    ).toHaveValue('노선도에 없는 역');
    await expect(
      page.getByRole('button', { name: GENERAL_STORY_COVER_COPY.remove }),
    ).toBeVisible();
    // 이어서 연 저장본은 바뀐 것이 없으니 닫기는 저장본 안내다.
    await page
      .getByRole('button', { name: GENERAL_STORY_CREATE_COPY.close })
      .click();
    await expect(
      page
        .getByRole('alertdialog')
        .getByText(DRAFT_EXIT_WARNING_COPY.saved.title),
    ).toBeVisible();
  });

  test('제목·한 줄 소개·표지 없이 임시 저장하면 카드는 기본 제목·설명·이미지를 보이고, 저장 뒤 뒤로가기는 저장본 안내를 띄운다 (STORY-GENERAL-17)', async ({
    page,
  }) => {
    await openGeneralCreate(page);
    await page.getByRole('tab', { name: GENERAL_STORY_TABS[1].label }).click();
    await page
      .getByLabel(GENERAL_STORY_TEXT_FIELDS.world.label)
      .fill('유실역은 막차가 끊긴 뒤에만 불이 켜진다');
    await saveButton(page).click();
    await expect(savedToast(page)).toBeVisible();
    // 연타해도 토스트는 하나만 남는다(이전 토스트를 대신한다).
    await saveButton(page).click();
    await saveButton(page).click();
    await expect(savedToast(page)).toHaveCount(1);

    await page.goBack();

    const exitDialog = page.getByRole('alertdialog');

    await expect(
      exitDialog.getByText(DRAFT_EXIT_WARNING_COPY.saved.title),
    ).toBeVisible();
    await exitDialog
      .getByRole('button', {
        name: DRAFT_EXIT_WARNING_COPY.saved.confirm,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));

    const card = draftCard(page);

    await expect(
      card.getByText(CREATION_PROGRESS_CARD_COPY.draftTitle),
    ).toBeVisible();
    await expect(
      card.getByText(CREATION_PROGRESS_CARD_COPY.draftDescription.general),
    ).toBeVisible();
    await expect(card.locator('img')).toHaveCount(0);
  });

  test('입력이 없으면 저장하지 않고, 저장하지 않은 입력은 뒤로가기·닫기에서 경고한다 (STORY-GENERAL-18)', async ({
    page,
  }) => {
    await openGeneralCreate(page);
    await expect(saveButton(page)).toBeDisabled();
    // 입력 없이 탭을 옮겨도 저장하지 않는다.
    await page.getByRole('tab', { name: GENERAL_STORY_TABS[1].label }).click();
    await expect(saveButton(page)).toBeDisabled();
    await page.getByRole('tab', { name: GENERAL_STORY_TABS[0].label }).click();

    const title = page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label);

    await title.fill('유실역');
    await page.goBack();

    const exitDialog = page.getByRole('alertdialog');

    await expect(
      exitDialog.getByText(DRAFT_EXIT_WARNING_COPY.unsavedNew.description),
    ).toBeVisible();
    await exitDialog
      .getByRole('button', {
        name: DRAFT_EXIT_WARNING_COPY.unsavedNew.cancel,
      })
      .click();
    await expect(exitDialog).toBeHidden();
    await expect(title).toHaveValue('유실역');

    await saveButton(page).click();
    await expect(savedToast(page)).toBeVisible();
    await title.fill('유실역 2');
    await expect(saveButton(page)).toBeEnabled();
    await page
      .getByRole('button', { name: GENERAL_STORY_CREATE_COPY.close })
      .click();
    await expect(
      exitDialog.getByText(DRAFT_EXIT_WARNING_COPY.unsaved.description),
    ).toBeVisible();
  });

  test('화면이 가려지면 저장하지 않은 입력을 임시 저장한다 (STORY-GENERAL-20)', async ({
    page,
  }) => {
    await openGeneralCreate(page);
    await page
      .getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label)
      .fill('노선도에 없는 역');
    // 탭 전환·앱 전환처럼 문서는 남은 채 화면만 가려진 상황을 흉내 낸다.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitForSavedDraft(page, '노선도에 없는 역');

    await page
      .getByRole('button', { name: GENERAL_STORY_CREATE_COPY.close })
      .click();

    const exitDialog = page.getByRole('alertdialog');

    await expect(
      exitDialog.getByText(DRAFT_EXIT_WARNING_COPY.saved.title),
    ).toBeVisible();
    await exitDialog
      .getByRole('button', {
        name: DRAFT_EXIT_WARNING_COPY.saved.confirm,
      })
      .click();
    await expect(draftCard(page).getByText('노선도에 없는 역')).toBeVisible();
  });

  test('저장하지 않은 입력이 있으면 새로고침·탭 닫기 때 브라우저 확인창을 띄운다 (STORY-GENERAL-19)', async ({
    page,
  }) => {
    await openGeneralCreate(page);

    const title = page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label);

    await title.click();
    await title.fill('유실역');

    const dialog = page.waitForEvent('dialog');

    void page.close({ runBeforeUnload: true });
    expect((await dialog).type()).toBe('beforeunload');
    await (await dialog).dismiss();
  });
});

test.describe('일반 제작 등록', () => {
  const GENERAL_STORY_API = '**/api/v1/stories/general';
  const tab = (page: Page, value: string) =>
    page.locator(`[role="tab"][data-tab-value="${value}"]`);
  const activePanel = (page: Page) => page.getByRole('tabpanel');
  const registerButton = (page: Page) =>
    page.getByRole('button', {
      name: GENERAL_STORY_CREATE_COPY.register,
      exact: true,
    });

  /** 제공 장르를 목킹하고 일반 제작을 연다. 장르 목록은 화면을 열 때 받는다. */
  async function openWithGenreTags(page: Page) {
    await page.route('**/api/v1/stories/simple/tags', (route) =>
      route.fulfill({ json: [{ id: 1, name: '판타지', category: 'GENRE' }] }),
    );
    await openGeneralCreate(page);
  }

  /** 필수 항목을 모두 채우고 등록 탭으로 옮긴다. 탭을 옮길 때마다 임시 저장된다. */
  async function fillRequiredForm(page: Page) {
    const { title, oneLineIntro, world, progression } =
      GENERAL_STORY_TEXT_FIELDS;
    const selectGender = async (label: string) => {
      await page.getByRole('combobox', { name: label }).click();
      await page.getByRole('option', { name: '여성' }).click();
    };

    await page.getByLabel(title.label).fill(' 노선도에 없는 역 ');
    await page.getByLabel(oneLineIntro.label).fill('막차에서 내린 곳');
    await tab(page, 'story').click();
    await page.getByLabel(world.label).fill('막차 뒤에만 열리는 역');
    await page.getByLabel(progression.label).fill('긴장감 있게 전개한다');
    await tab(page, 'protagonist').click();
    await page.getByRole('textbox', { name: '주인공 이름' }).fill('윤해솔');
    await selectGender('주인공 성별');
    await activePanel(page)
      .getByLabel(GENERAL_STORY_CHARACTER_COPY.featureLabel)
      .fill('겁이 많은 회사원');
    await tab(page, 'supporting').click();
    await page
      .getByRole('textbox', { name: '주변 인물 1 이름' })
      .fill('도하람');
    await selectGender('주변 인물 1 성별');
    await tab(page, 'start').click();
    await page.getByLabel(GENERAL_STORY_START_COPY.name.label).fill('승강장');
    await page
      .getByLabel(GENERAL_STORY_START_COPY.prologue.label)
      .fill('불 꺼진 승강장에 내렸다');
    await page
      .getByLabel(GENERAL_STORY_START_COPY.situation.label)
      .fill('열차가 떠나고 혼자 남았다');

    for (const index of [1, 2, 3]) {
      await page
        .getByRole('textbox', {
          name: `${GENERAL_STORY_START_COPY.suggestedInput.label} ${index}`,
        })
        .fill(`추천 입력 ${index}`);
    }

    await tab(page, 'publish').click();
    await page.getByRole('button', { name: '판타지', exact: true }).click();
  }

  const SUBMISSION_API = '**/api/v1/stories/submissions/submission-1';
  const readDraftStorage = async (page: Page) =>
    (await readCreationStorage(page, PENDING_CREATION_REQUEST_STORAGE_KEY)) ??
    '';

  /** 등록 요청을 202로 접수하고, 받은 요청 본문을 기록한다. */
  async function mockRegisterAccepted(page: Page) {
    const requests: Record<string, unknown>[] = [];

    await page.route(GENERAL_STORY_API, async (route) => {
      requests.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 202,
        json: { submissionId: 'submission-1', status: 'PENDING' },
      });
    });

    return requests;
  }

  test('필수 항목을 채워 등록하면 검토 중을 안내하고, 승인되면 임시 저장본을 지운 뒤 채팅방으로 간다 (STORY-GENERAL-21)', async ({
    page,
  }) => {
    const registerRequests = await mockRegisterAccepted(page);
    const chatRequests: Record<string, unknown>[] = [];
    let submissionReads = 0;

    await page.route(SUBMISSION_API, async (route) => {
      submissionReads += 1;
      await route.fulfill({
        json:
          submissionReads < 2
            ? { submissionId: 'submission-1', status: 'PENDING' }
            : {
                submissionId: 'submission-1',
                status: 'APPROVED',
                storyId: 'story-1',
              },
      });
    });
    await page.route('**/api/v1/chats', async (route) => {
      chatRequests.push(
        route.request().postDataJSON() as Record<string, unknown>,
      );
      await route.fulfill({ status: 201, json: { id: 'chat-1' } });
    });
    await openWithGenreTags(page);
    await fillRequiredForm(page);
    await expect
      .poll(() => readDraftStorage(page))
      .toContain('노선도에 없는 역');

    await registerButton(page).click();
    await expect(
      page.getByLabel(GENERAL_STORY_CREATE_COPY.registering),
    ).toBeVisible();
    await expect(page.getByText(TOAST_MESSAGE.STORY_REVIEWING)).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.CHAT_ROOM('chat-1')}$`),
    );
    expect(registerRequests).toHaveLength(1);
    expect(registerRequests[0]).toMatchObject({
      title: '노선도에 없는 역',
      oneLineIntro: '막차에서 내린 곳',
      genres: ['판타지'],
      visibility: 'PRIVATE',
      characters: [{ name: '도하람', images: [] }],
      startSettings: [
        {
          name: '승강장',
          suggestedInputs: ['추천 입력 1', '추천 입력 2', '추천 입력 3'],
          endings: [],
        },
      ],
      mainEvents: [],
    });
    expect(registerRequests[0]).not.toHaveProperty('description');
    expect(chatRequests).toEqual([{ storyId: 'story-1' }]);
    await expect(page.getByText(TOAST_MESSAGE.STORY_REVIEWING)).toHaveCount(0);
    expect(await readDraftStorage(page)).not.toContain('노선도에 없는 역');

    // 채팅방에서 뒤로가기는 등록을 마친 일반 제작 화면으로 돌아가지 않는다.
    await page.goBack();
    await expect(page).not.toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.GENERAL}$`),
    );
  });

  test('검토를 통과하지 못하면 안내하고 입력을 두며, 다시 등록하면 같은 제출본을 재제출한다 (STORY-GENERAL-25)', async ({
    page,
  }) => {
    const registerRequests = await mockRegisterAccepted(page);
    const resubmitRequests: Record<string, unknown>[] = [];

    await page.route(SUBMISSION_API, async (route) => {
      if (route.request().method() === 'PUT') {
        resubmitRequests.push(
          route.request().postDataJSON() as Record<string, unknown>,
        );
        await route.fulfill({
          status: 202,
          json: { submissionId: 'submission-1', status: 'PENDING' },
        });

        return;
      }

      await route.fulfill({
        json: {
          submissionId: 'submission-1',
          status: 'REJECTED',
          issues: [
            {
              path: 'startSettings[0].prologue',
              type: 'TEXT',
              rule: 'DRUGS',
              reason: '마약 사용을 직접 권장합니다.',
            },
          ],
        },
      });
    });
    await openWithGenreTags(page);
    await fillRequiredForm(page);
    await registerButton(page).click();

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_REVIEW_REJECTED),
    ).toBeVisible();
    await expect(page.getByText(TOAST_MESSAGE.STORY_REVIEWING)).toHaveCount(0);
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.GENERAL}$`),
    );
    // 사유가 있는 시작 상황 설정 탭으로 옮겨 칸에 사유를 보이고, 폼 위에 반려 안내를 둔다.
    await expect(
      page.getByRole('status', {
        name: GENERAL_STORY_REVIEW_COPY.rejectedTitle,
        exact: true,
      }),
    ).toBeVisible();
    await expect(tab(page, 'start')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('마약 사용을 직접 권장합니다.')).toBeVisible();
    await expect(
      page.getByLabel(GENERAL_STORY_START_COPY.prologue.label),
    ).toHaveAttribute('aria-invalid', 'true');
    // 접수된 입력은 서버 제출본이 정본이라 임시 저장본을 지우고 다시 임시 저장하지 않는다.
    expect(await readDraftStorage(page)).not.toContain('노선도에 없는 역');
    await expect(
      page.getByRole('button', {
        name: DRAFT_SAVE_BUTTON_LABEL,
        exact: true,
      }),
    ).toBeDisabled();

    await tab(page, 'publish').click();
    await expect(registerButton(page)).toBeEnabled();
    await registerButton(page).click();
    await expect.poll(() => resubmitRequests.length).toBe(1);
    expect(resubmitRequests[0]).toMatchObject({ title: '노선도에 없는 역' });
    expect(registerRequests).toHaveLength(1);
  });

  test('검토가 1분 넘게 끝나지 않으면 기다리지 않고 제작 탭으로 가 늦어진다고 안내한다 (STORY-GENERAL-26)', async ({
    page,
  }) => {
    await page.clock.install();
    await mockRegisterAccepted(page);
    await page.route(SUBMISSION_API, (route) =>
      route.fulfill({
        json: { submissionId: 'submission-1', status: 'PENDING' },
      }),
    );
    await openWithGenreTags(page);
    await fillRequiredForm(page);

    const firstRead = page.waitForRequest(SUBMISSION_API);

    await registerButton(page).click();
    await firstRead;
    await page.clock.fastForward('01:01');

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(
      page.getByText(TOAST_MESSAGE.STORY_REVIEW_DELAYED),
    ).toBeVisible();
    expect(await readDraftStorage(page)).not.toContain('노선도에 없는 역');
  });

  test('검토 중에 나가면 제출본이 있다고 안내하고, 이어서 만들 임시 저장본을 남기지 않는다 (STORY-GENERAL-28)', async ({
    page,
  }) => {
    await mockRegisterAccepted(page);
    await page.route(SUBMISSION_API, (route) =>
      route.fulfill({
        json: { submissionId: 'submission-1', status: 'PENDING' },
      }),
    );
    await openWithGenreTags(page);
    await fillRequiredForm(page);
    await expect
      .poll(() => readDraftStorage(page))
      .toContain('노선도에 없는 역');

    const firstRead = page.waitForRequest(SUBMISSION_API);

    await registerButton(page).click();
    await firstRead;
    await page
      .getByRole('button', { name: GENERAL_STORY_CREATE_COPY.close })
      .click();

    const exitDialog = page.getByRole('alertdialog');

    await expect(
      exitDialog.getByText(DRAFT_EXIT_WARNING_COPY.submitted.description),
    ).toBeVisible();
    await exitDialog
      .getByRole('button', {
        name: DRAFT_EXIT_WARNING_COPY.submitted.confirm,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.STUDIO}$`));
    await expect(page.getByText(TOAST_MESSAGE.STORY_REVIEWING)).toHaveCount(0);
    await expect(
      page.getByRole('article', {
        name: CREATION_PROGRESS_CARD_COPY.draftTitle,
      }),
    ).toHaveCount(0);
    expect(await readDraftStorage(page)).not.toContain('노선도에 없는 역');
  });

  test('등록 요청이 실패하면 안내하고 입력을 그대로 둔다 (STORY-GENERAL-22)', async ({
    page,
  }) => {
    await page.route(GENERAL_STORY_API, (route) =>
      route.fulfill({ status: 500, json: { status: 500 } }),
    );
    await openWithGenreTags(page);
    await fillRequiredForm(page);
    await registerButton(page).click();

    await expect(
      page.getByText(TOAST_MESSAGE.STORY_REGISTER_FAILED),
    ).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.GENERAL}$`),
    );
    await expect(registerButton(page)).toBeEnabled();
    await tab(page, 'basic').click();
    await expect(
      page.getByLabel(GENERAL_STORY_TEXT_FIELDS.title.label),
    ).toHaveValue(' 노선도에 없는 역 ');
  });

  test('게스트는 제작 방식 선택에서 일반 제작을 고르면 로그인 시트를 보고, 주소로 들어오면 로그인 화면으로 간다 (STORY-GENERAL-23)', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockGuestSession(page);

    // 세션 조회로 게스트가 확정되기 전에 누르면 링크가 일반 제작으로 이동해 게이트가 로그인 화면으로
    // 보낸다. 조회 응답을 기다린 뒤 누르고, 그래도 판정 전에 눌렸으면 진입부터 다시 시도한다.
    await expect(async () => {
      const session = page.waitForResponse('**/api/auth/session');

      await page.goto(APP_PATH.STUDIO.STORY.SELECT);
      await session;
      await page
        .getByRole('link', {
          name: new RegExp(STORY_MODE_SELECT_COPY.general.title),
        })
        .click();
      await expect(
        page
          .getByRole('dialog')
          .getByRole('heading', { name: oneLine(LOGIN_COPY.title) }),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SELECT}$`),
    );

    await page.goto(APP_PATH.STUDIO.STORY.GENERAL);
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}\\?`));
  });
});
