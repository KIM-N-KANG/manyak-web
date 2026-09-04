import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { DELETED_STORY_LABEL } from '@/features/chats/_shared/constants/deleted-story';
import { STORY_REPORT_COPY } from '@/features/stories/_shared/constants/story-report';

import { mockMemberSession } from '../fixtures/auth';
import {
  expect,
  seedChatIds,
  seedStoryIds,
  skipOnboarding,
  test,
} from '../fixtures/test';

// 채팅 목록은 localStorage의 ID로 POST /api/v1/chats/batch 를 호출해 카드를 그린다.
// toChatListItems가 필수 필드(id·storyId·storyTitle·lastStoryPreview·updatedAt)를 모두 갖춘 항목만 남기므로
// 모킹 응답도 해당 필드를 모두 채운다.
const CHATS_BATCH = '**/api/v1/chats/batch';

const chat = (id: string, storyTitle: string) => ({
  id,
  storyId: `story-${id}`,
  storyTitle,
  lastStoryPreview: '이야기 미리보기입니다',
  turnCount: 3,
  updatedAt: '2026-06-01T00:00:00Z',
});

test.describe('채팅 목록', () => {
  test('보관한 ID로 진행 중인 채팅 목록을 보여준다 (US-5-1)', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1', 'c2']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          chat('c1', '용의 계곡'),
          chat('c2', '별빛 항해'),
        ]),
      });
    });

    await page.goto('/chats');

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(page.getByText('별빛 항해', { exact: true })).toBeVisible();
  });

  test('참조 스토리가 삭제된 채팅은 제목 자리에 상태를 보여준다', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        // 스토리가 삭제되면 서버가 제목을 빈 문자열로 내려준다.
        body: JSON.stringify([chat('c1', '')]),
      });
    });

    await page.goto('/chats');

    await expect(
      page.getByText(DELETED_STORY_LABEL, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: `${DELETED_STORY_LABEL} 채팅 보기`,
      }),
    ).toBeVisible();
  });

  test('조회 중에는 실제 채팅 카드와 같은 행 스켈레톤을 보여준다 (KNK-1043)', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1']);

    let releaseResponse!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(CHATS_BATCH, async (route) => {
      await responseGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([chat('c1', '용의 계곡')]),
      });
    });

    await page.goto(APP_PATH.MAIN.CHATS);

    const skeletonList = page.locator('main ul[aria-hidden="true"]');
    const skeletonRow = skeletonList.locator(':scope > li').first();
    const skeletonCover = skeletonRow.locator('[data-slot="aspect-ratio"]');
    const skeletonSurface = skeletonCover.locator('[data-slot="skeleton"]');

    await expect(skeletonList).toBeVisible();
    await expect(skeletonList).toHaveCSS('padding-bottom', '8px');
    await expect(skeletonRow).toHaveCSS('padding-top', '8px');
    await expect(skeletonRow).toHaveCSS('padding-right', '16px');
    await expect(skeletonRow).toHaveCSS('padding-bottom', '8px');
    await expect(skeletonRow).toHaveCSS('padding-left', '16px');
    await expect(skeletonCover).toHaveCSS('width', '48px');
    await expect(skeletonSurface).toHaveCSS('border-radius', '12px');

    releaseResponse();

    const chatCard = page
      .getByRole('link', { name: '용의 계곡 채팅 보기' })
      .locator('..');
    const chatCover = chatCard.locator('[data-slot="aspect-ratio"]');

    await expect(chatCard).toBeVisible();
    await expect(chatCard).toHaveCSS('padding-top', '8px');
    await expect(chatCard).toHaveCSS('padding-right', '16px');
    await expect(chatCard).toHaveCSS('padding-bottom', '8px');
    await expect(chatCard).toHaveCSS('padding-left', '16px');
    await expect(chatCover).toHaveCSS('width', '48px');
    await expect(chatCover).toHaveCSS('border-radius', '12px');
  });

  test('채팅을 누르면 채팅 화면으로 이어간다 (US-5-2)', async ({ page }) => {
    await seedChatIds(page, ['c1']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([chat('c1', '용의 계곡')]),
      });
    });

    await page.goto('/chats');
    await page.getByRole('link', { name: '용의 계곡 채팅 보기' }).click();

    await expect(page).toHaveURL(/\/chats\/c1$/);
  });

  test('진행 중인 채팅도 스토리도 없으면 스토리 만들기를 안내한다 (US-5-4)', async ({
    page,
  }) => {
    // 채팅 ID를 심지 않으면 목록이 비어 있고, 온보딩을 건너뛰어 다이얼로그가 뜨지 않게 한다.
    await skipOnboarding(page);

    await page.goto('/chats');

    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();

    // base-ui Button(render=Link)은 role="button"인 앵커라 button 역할로 잡힌다.
    const link = page.getByRole('button', { name: '스토리 만들기' });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', APP_PATH.STUDIO.STORY.SIMPLE);
  });

  test('진행 중인 채팅은 없지만 스토리가 있으면 스토리 목록으로 안내한다 (US-5-4)', async ({
    page,
  }) => {
    // 스토리 ID를 심으면 채팅이 없어도 온보딩 게이팅을 통과하고, 안내가 스토리 목록 이동으로 분기된다.
    await seedStoryIds(page, ['s1']);

    await page.goto('/chats');

    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();

    // base-ui Button(render=Link)은 role="button"인 앵커라 button 역할로 잡힌다.
    const link = page.getByRole('button', { name: '스토리 목록으로 가기' });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', APP_PATH.MAIN.STUDIO);
  });

  test('로그인 상태에서는 서버의 내 채팅 목록을 보여준다', async ({ page }) => {
    // 로컬 ID 없이 회원 목록 API만으로 카드를 그린다(이관도 발동하지 않음).
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/chats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([chat('c1', '회원의 채팅')]),
      });
    });

    await page.goto('/chats');

    await expect(page.getByText('회원의 채팅', { exact: true })).toBeVisible();
  });

  test('로그인 상태에서 채팅은 없지만 서버에 스토리가 있으면 스토리 목록으로 안내한다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/chats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    });
    await page.route('**/api/v1/users/me/stories**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 's1',
            title: '회원의 서재',
            oneLineIntro: '한 줄 소개입니다',
            genres: ['판타지'],
            createdAt: '2026-06-01T00:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/chats');

    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '스토리 목록으로 가기' }),
    ).toBeVisible();
  });
});

test.describe('채팅 카드 옵션 (KNK-1186)', () => {
  const CHAT_DELETE = '**/api/v1/chats/c1';

  test('카드 옵션 버튼은 제목 줄 오른쪽에 있고 다이얼로그 상단에 그 카드의 축소판을 보여준다', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1', 'c2']);
    await page.route(CHATS_BATCH, async (route) => {
      // 삭제 후 재조회는 남은 ID로만 오므로 요청 본문 기준으로 응답한다.
      const { chatIds } = route.request().postDataJSON() as {
        chatIds: string[];
      };
      // 긴 미리보기는 축소판이 다이얼로그 폭을 넘기지 않는지 함께 검증한다.
      const chats = [
        {
          ...chat('c1', '용의 계곡'),
          lastStoryPreview:
            '*시현이손을뻗어인터페이스의비상봉인패널을연다붉은경고등이깜빡이고산소잔량표시가급격히떨어진다*',
        },
        chat('c2', '별빛 항해'),
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chats.filter((item) => chatIds.includes(item.id))),
      });
    });
    await page.route(CHAT_DELETE, async (route) => {
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/chats');

    const optionsButton = page
      .getByRole('button', { name: '채팅 옵션 더보기' })
      .first();
    const title = page.getByText('용의 계곡', { exact: true });

    await expect(optionsButton).toHaveCSS('height', '24px');

    const [titleBox, buttonBox] = await Promise.all([
      title.boundingBox(),
      optionsButton.boundingBox(),
    ]);

    // 버튼 세로 중심은 제목 첫 줄(24px) 중심보다 1px 위다(한글 잉크·아이콘 점 위치 보정).
    expect(buttonBox!.y + buttonBox!.height / 2).toBeCloseTo(
      titleBox!.y + 11,
      0,
    );

    await optionsButton.click();

    const dialog = page.getByRole('dialog', { name: '채팅 옵션' });

    await expect(dialog.getByText('용의 계곡', { exact: true })).toBeVisible();
    await expect(dialog.getByText('별빛 항해')).toHaveCount(0);

    const [dialogBox, previewBox] = await Promise.all([
      dialog.boundingBox(),
      dialog.getByText('용의 계곡', { exact: true }).boundingBox(),
    ]);

    expect(previewBox!.x + previewBox!.width).toBeLessThanOrEqual(
      dialogBox!.x + dialogBox!.width,
    );
    // 게스트라 신고하기는 없고 삭제하기만 있다.
    await expect(dialog.getByRole('menuitem')).toHaveText(['삭제하기']);

    await dialog.getByRole('menuitem', { name: '삭제하기' }).click();

    // 같은 창이 확인 화면으로 바뀌므로 접근 가능한 이름도 확인 질문으로 바뀐다.
    const confirmDialog = page.getByRole('dialog', {
      name: '채팅을 삭제할까요?',
    });

    await expect(
      confirmDialog.getByText(
        '삭제하면 나눈 이야기가 모두 사라지며 되돌릴 수 없어요',
      ),
    ).toBeVisible();
    await confirmDialog.getByRole('button', { name: '삭제하기' }).click();

    await expect(page.getByText(TOAST_MESSAGE.CHAT_DELETED)).toBeVisible();
    await expect(page.getByText('용의 계곡', { exact: true })).toHaveCount(0);
    await expect(page.getByText('별빛 항해', { exact: true })).toBeVisible();
  });

  test('회원은 카드 옵션에서 참조 스토리를 신고할 수 있다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await mockMemberSession(page);
    await page.route('**/api/v1/users/me/chats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([chat('c1', '용의 계곡')]),
      });
    });
    await page.route('**/api/v1/stories/story-c1/reports', async (route) => {
      await route.fulfill({ status: 201, body: '' });
    });

    await page.goto('/chats');
    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();

    const dialog = page.getByRole('dialog', { name: '채팅 옵션' });

    await expect(dialog.getByRole('menuitem')).toHaveText([
      STORY_REPORT_COPY.action,
      '삭제하기',
    ]);
    await dialog
      .getByRole('menuitem', { name: STORY_REPORT_COPY.action })
      .click();

    const sheet = page.getByRole('dialog', { name: STORY_REPORT_COPY.title });

    await expect(dialog).toBeHidden();
    await sheet.getByRole('radio', { name: '기타' }).check();
    await sheet.getByRole('button', { name: STORY_REPORT_COPY.submit }).click();

    await expect(page.getByText(TOAST_MESSAGE.STORY_REPORTED)).toBeVisible();
  });
});
