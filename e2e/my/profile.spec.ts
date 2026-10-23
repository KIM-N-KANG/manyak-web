import type { Page } from '@playwright/test';

import type { MeResponse, UpdateProfileRequest } from '@/api/generated/models';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  NICKNAME_ERROR_COPY,
  PROFILE_EDIT_COPY,
  PROFILE_PRESET_SHEET_COPY,
} from '@/features/my/profile/constants';
import { DRAFT_EXIT_WARNING_COPY } from '@/features/stories/_shared/constants/draft-exit-warning';

import { mockGuestSession, mockMemberSession } from '../fixtures/auth';
import { expect, test } from '../fixtures/test';

const presetUrl = (key: string) =>
  `https://api.manyak.app/profile-presets/${encodeURIComponent(key)}.png`;

const PRESETS = ['이야기꾼', '작가', '탐험가'].map((key) => ({
  key,
  imageUrl: presetUrl(key),
  thumbnailBase64: null,
}));

const ME: MeResponse = {
  id: 'user-1',
  nickname: '배고픈송아지',
  profileImageUrl: presetUrl('이야기꾼'),
  profileThumbnailBase64: null,
  status: 'ACTIVE',
  creditBalance: 0,
  attendedToday: false,
  linkedProviders: ['google'],
};

/**
 * 회원 정보 조회와 프로필 수정, 프리셋 목록을 목킹한다. 수정은 성공하면 조회 응답에 반영한다.
 *
 * @param page 대상 페이지
 * @param options.updateStatus 수정 응답 상태. 200이 아니면 오류로 응답한다
 * @returns 받은 수정 요청 본문 목록
 */
async function mockProfileApi(
  page: Page,
  { updateStatus = 200 }: { updateStatus?: number } = {},
) {
  let me = { ...ME };
  const updates: UpdateProfileRequest[] = [];

  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: me }));
  await page.route('**/api/v1/profile-presets', (route) =>
    route.fulfill({ json: PRESETS }),
  );
  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();

      return;
    }

    const body = route.request().postDataJSON() as UpdateProfileRequest;

    updates.push(body);

    if (updateStatus !== 200) {
      await route.fulfill({
        status: updateStatus,
        json: { status: updateStatus, code: 'NICKNAME_TAKEN' },
      });

      return;
    }

    me = {
      ...me,
      ...(body.nickname ? { nickname: body.nickname } : {}),
      ...(body.profileImagePreset
        ? { profileImageUrl: presetUrl(body.profileImagePreset) }
        : {}),
    };
    await route.fulfill({ json: me });
  });

  return updates;
}

async function openProfileEdit(page: Page) {
  await mockMemberSession(page, { nickname: ME.nickname });
  await page.goto(APP_PATH.MAIN.MY);
  await page.getByRole('link', { name: /프로필 수정/ }).click();
  await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PROFILE_EDIT}$`));
}

const nicknameInput = (page: Page) =>
  page.getByRole('textbox', { name: PROFILE_EDIT_COPY.nicknameLabel });

const saveButton = (page: Page) =>
  page.getByRole('button', { name: PROFILE_EDIT_COPY.submit });

test.describe('프로필 수정', () => {
  test('마이 프로필 영역으로 들어가 닉네임과 이미지를 바꿔 저장하면 바뀐 값만 보내고 마이에 반영한다 (KNK-1148)', async ({
    page,
  }) => {
    const updates = await mockProfileApi(page);

    await openProfileEdit(page);
    await expect(nicknameInput(page)).toHaveValue(ME.nickname ?? '');
    await expect(saveButton(page)).toBeDisabled();

    await page
      .getByRole('button', { name: PROFILE_EDIT_COPY.imageButtonLabel })
      .click();

    const sheet = page.getByRole('dialog', {
      name: PROFILE_PRESET_SHEET_COPY.title,
    });

    await expect(
      sheet.getByRole('button', { name: '이야기꾼' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: '작가' }).click();
    await expect(sheet).toBeHidden();

    await nicknameInput(page).fill('달빛작가');

    const sessionUpdate = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/auth/session') &&
        request.method() === 'POST',
    );

    await saveButton(page).click();

    expect(
      (await sessionUpdate).postDataJSON() as { data?: unknown },
    ).toMatchObject({ data: { profileRefresh: true } });
    expect(updates).toEqual([
      { nickname: '달빛작가', profileImagePreset: '작가' },
    ]);
    await expect(page.getByText(TOAST_MESSAGE.PROFILE_SAVED)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.MY}$`));
    await expect(page.getByRole('link', { name: /달빛작가/ })).toBeVisible();
    await expect(nicknameInput(page)).toHaveCount(0);
  });

  test('바꾼 내용 없이 헤더 뒤로가기를 누르면 마이 화면으로 돌아간다 (MY-PROFILE-09)', async ({
    page,
  }) => {
    const updates = await mockProfileApi(page);

    await openProfileEdit(page);
    await expect(nicknameInput(page)).toHaveValue(ME.nickname ?? '');
    await expect(saveButton(page)).toBeDisabled();
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .tap();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.MY}$`));
    await expect(
      page.getByRole('link', {
        name: new RegExp(PROFILE_EDIT_COPY.headerTitle),
      }),
    ).toBeVisible();
    await expect(nicknameInput(page)).toHaveCount(0);
    expect(updates).toEqual([]);
  });

  test('회원이 주소로 바로 열어도 헤더 뒤로가기로 마이 화면에 간다 (MY-PROFILE-10)', async ({
    page,
  }) => {
    await mockProfileApi(page);
    await mockMemberSession(page, { nickname: ME.nickname });
    await page.goto(APP_PATH.MY_PROFILE_EDIT);
    await expect(nicknameInput(page)).toHaveValue(ME.nickname ?? '');
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .tap();

    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.MY}$`));
    await expect(
      page.getByRole('link', {
        name: new RegExp(PROFILE_EDIT_COPY.headerTitle),
      }),
    ).toBeVisible();
    await expect(nicknameInput(page)).toHaveCount(0);
  });

  test('규칙을 어긴 닉네임은 보내지 않고, 이미 쓰는 닉네임은 서버 사유를 보여 주며 입력을 유지한다 (KNK-1148)', async ({
    page,
  }) => {
    const updates = await mockProfileApi(page, { updateStatus: 409 });

    await openProfileEdit(page);

    await nicknameInput(page).fill('홍 길동');
    await saveButton(page).click();
    await expect(
      page.getByText(NICKNAME_ERROR_COPY.invalidCharacter),
    ).toBeVisible();

    await nicknameInput(page).fill('달');
    await expect(
      page.getByText(PROFILE_EDIT_COPY.nicknameDescription),
    ).toBeVisible();
    await saveButton(page).click();
    await expect(page.getByText(NICKNAME_ERROR_COPY.tooShort)).toBeVisible();
    expect(updates).toEqual([]);

    await nicknameInput(page).fill('달빛작가');
    await saveButton(page).click();
    await expect(page.getByText(NICKNAME_ERROR_COPY.taken)).toBeVisible();
    expect(updates).toEqual([{ nickname: '달빛작가' }]);
    await expect(nicknameInput(page)).toHaveValue('달빛작가');
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MY_PROFILE_EDIT}$`));
  });

  test('바꾼 내용이 남은 채 뒤로 가면 확인하고, 나가기를 고르면 마이로 돌아간다 (KNK-1148)', async ({
    page,
  }) => {
    const updates = await mockProfileApi(page);
    const exitCopy = DRAFT_EXIT_WARNING_COPY.unsavedEdit;

    await openProfileEdit(page);
    await nicknameInput(page).fill('달빛작가');
    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();

    const dialog = page.getByRole('alertdialog', { name: exitCopy.title });

    await dialog.getByRole('button', { name: exitCopy.cancel }).click();
    await expect(dialog).toBeHidden();
    await expect(nicknameInput(page)).toHaveValue('달빛작가');

    await page.goBack();
    await dialog.getByRole('button', { name: exitCopy.confirm }).click();
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.MAIN.MY}$`));
    await expect(
      page.getByRole('link', {
        name: new RegExp(PROFILE_EDIT_COPY.headerTitle),
      }),
    ).toBeVisible();
    await expect(nicknameInput(page)).toHaveCount(0);
    expect(updates).toEqual([]);
  });

  test('게스트가 주소로 열면 로그인 화면으로 보낸다 (KNK-1148)', async ({
    page,
  }) => {
    await mockGuestSession(page);
    await page.goto(APP_PATH.MY_PROFILE_EDIT);
    await expect(page).toHaveURL(new RegExp(`${APP_PATH.LOGIN}$`));
  });
});
