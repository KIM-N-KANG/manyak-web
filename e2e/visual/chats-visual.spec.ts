import { expect, seedChatIds, skipOnboarding, test } from '../fixtures/test';
import { VISUAL_FIXED_NOW, waitForFonts } from '../fixtures/visual';

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
