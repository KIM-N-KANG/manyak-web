import { mockMemberSession } from '../fixtures/auth';
import {
  expect,
  seedChatIds,
  seedGuestUsage,
  skipOnboarding,
  test,
} from '../fixtures/test';
import {
  VISUAL_FIXED_NOW,
  waitForDarkTheme,
  waitForFonts,
} from '../fixtures/visual';

/**
 * 채팅 화면의 안정된 정적 상태를 스크린샷으로 비교하는 비주얼 회귀 스펙.
 * 동작(요청 계약·이동·상태 전이)은 `chats/*.spec.ts`가 검증하고, 여기서는
 * CSS·레이아웃 회귀만 잡는다. 스트리밍 진행 중 같은 동적 상태는 다루지 않는다.
 * 기준 이미지는 Linux 렌더링만 정본이다(`playwright.config.ts`의 `ignoreSnapshots` 참고).
 */

const CHAT_DETAIL = '**/api/v1/chats/c1';
const CHATS_BATCH = '**/api/v1/chats/batch';

const chat = (id: string, storyTitle: string, lastStoryPreview: string) => ({
  id,
  storyId: `story-${id}`,
  storyTitle,
  lastStoryPreview,
  turnCount: 3,
  updatedAt: '2026-06-01T00:00:00Z',
});

const chatDetail = (turns: unknown[] = []) => ({
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns,
  suggestedInputs: ['던전에 진입한다', '주변을 둘러본다'],
});

test.describe('채팅 비주얼', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
  });

  test('채팅 목록 기본 상태 (CHAT-LIST-02)', async ({ page }) => {
    await seedChatIds(page, ['c1', 'c2']);
    await page.route(CHATS_BATCH, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          chat('c1', '용의 계곡', '이야기 미리보기입니다'),
          chat('c2', '별빛 항해', ''),
        ]),
      });
    });

    await page.goto('/chats');

    await expect(page.getByText('용의 계곡', { exact: true })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-list-default.png');
  });

  test('채팅 목록 빈 상태 (CHAT-LIST-04)', async ({ page }) => {
    await skipOnboarding(page);

    await page.goto('/chats');

    await expect(page.getByText('아직 진행중인 채팅이 없어요')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-list-empty.png');
  });

  test('채팅방 초기 상태: 프롤로그·추천 입력·블럭 입력 (CHAT-ENTRY-01)', async ({
    page,
  }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });

    await page.goto('/chats/c1');

    await expect(
      page.getByText('안개 낀 계곡 앞에 한 용사가 섰다.'),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder('어떤 상황을 묘사할까요?'),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-room-initial.png');
  });

  test('채팅방 대화 진행 상태: 턴·선택지·재생성 버튼 (CHAT-ENTRY-02)', async ({
    page,
  }) => {
    const turns = [
      {
        id: 1,
        userInput: '던전에 진입한다',
        aiOutput: '문이 서서히 열린다. *차가운 공기가 밀려온다.*',
        choices: [],
        createdAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 2,
        userInput: '*횃불을 켠다* 누구 없어요?',
        aiOutput: '**어둠 속에서** 낮은 울림이 대답했다.',
        choices: ['앞으로 나아간다', '소리의 방향을 살핀다'],
        createdAt: '2026-06-01T00:00:00Z',
      },
    ];

    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail(turns)),
      });
    });

    await page.goto('/chats/c1');

    await expect(page.getByRole('button', { name: '다시 생성' })).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-room-turns.png');
  });

  test('채팅방 로드 실패 상태 (CHAT-ENTRY-04)', async ({ page }) => {
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({ status: 500, body: '' });
    });

    await page.goto('/chats/c1');

    await expect(page.getByText('채팅을 불러오지 못했어요')).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-room-error.png');
  });
});

/**
 * 오버레이(드로어·다이얼로그·팝오버)는 body로 포털되고 z-index·백드롭·포커스 트랩이
 * 얽혀 레이아웃이 깨지기 쉬우므로 별도로 고정한다. 같은 컴포넌트를 재사용하는 화면은
 * 대표 한 곳만 찍는다 — 여러 장을 찍어도 같은 회귀를 중복 검출할 뿐이다.
 */
test.describe('채팅 오버레이 비주얼', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail()),
      });
    });
  });

  test('채팅 옵션 메뉴 (CHAT-SET-01)', async ({ page }) => {
    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();

    // 드랍다운 메뉴(destructive 항목) 대표 스냅샷이다(스토리 옵션 메뉴도 같은 컴포넌트).
    await expect(
      page.getByRole('menuitem', { name: '채팅 삭제하기' }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-options-menu.png');
  });

  test('입력 모드 메뉴 (CHAT-BLOCK-07)', async ({ page }) => {
    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '입력 모드 변경' }).click();

    // 드랍다운 라디오 항목 대표 스냅샷이다.
    await expect(
      page.getByRole('menuitemradio', { name: /블럭 입력/ }),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-input-mode-menu.png');
  });

  test('삭제 확인 다이얼로그 (CHAT-SET-02)', async ({ page }) => {
    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '채팅 옵션 더보기' }).click();
    await page.getByRole('menuitem', { name: '채팅 삭제하기' }).click();

    // ConfirmAlertDialog 공용 컴포넌트의 대표 스냅샷이다(스토리 삭제·퍼널 이탈도 같은 컴포넌트).
    await expect(
      page.getByRole('alertdialog').getByText('채팅을 삭제할까요?'),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('confirm-alert-dialog.png');
  });

  test('게스트 한도 로그인 유도 다이얼로그 (CHAT-LIMIT-01)', async ({
    page,
  }) => {
    await seedGuestUsage(page, { chat: 5 });
    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();

    await expect(
      page.getByRole('dialog').getByText('게스트 체험 횟수를 모두 사용했어요'),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('login-required-dialog.png');
  });

  test('회원 크레딧 부족 다이얼로그 (CHAT-LIMIT-03)', async ({ page }) => {
    await mockMemberSession(page);
    await page.route('**/api/v1/chats/c1/turns/stream', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INSUFFICIENT_CREDIT' }),
      });
    });

    await page.goto('/chats/c1');
    await page.getByRole('button', { name: '추천 입력 랜덤 전송' }).click();

    await expect(
      page.getByRole('alertdialog').getByText('크레딧이 부족해요'),
    ).toBeVisible();
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('credit-shortage-dialog.png');
  });
});

/**
 * 다크 모드 대표 스냅샷. next-themes가 `.dark`를 붙일 때까지 기다린 뒤 찍는다.
 * 전 화면을 2배로 찍지 않고, 시맨틱 토큰을 가장 많이 쓰는 화면만 고정해
 * 하드코딩 색상(`text-blue-500` 등) 회귀를 감지한다.
 */
test.describe('채팅 다크 모드 비주얼', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(VISUAL_FIXED_NOW);
  });

  test('채팅방 대화 진행 상태 (다크)', async ({ page }) => {
    const turns = [
      {
        id: 1,
        userInput: '던전에 진입한다',
        aiOutput: '문이 서서히 열린다. *차가운 공기가 밀려온다.*',
        choices: ['앞으로 나아간다', '소리의 방향을 살핀다'],
        createdAt: '2026-06-01T00:00:00Z',
      },
    ];

    await page.route(CHAT_DETAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(chatDetail(turns)),
      });
    });

    await page.goto('/chats/c1');

    await expect(page.getByRole('button', { name: '다시 생성' })).toBeVisible();
    await waitForDarkTheme(page);
    await waitForFonts(page);
    await expect(page).toHaveScreenshot('chat-room-turns-dark.png');
  });
});
