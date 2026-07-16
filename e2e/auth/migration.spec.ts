import { type Page } from '@playwright/test';

import { mockMemberSession } from '../fixtures/auth';
import { expect, seedChatIds, test } from '../fixtures/test';

/**
 * 로그인 직후 게스트 데이터 자동 이관 스펙(QA AUTH-MIGRATE-03·08).
 * 게스트가 만든 채팅(`user_id` NULL)은 회원 요청에 403이므로(백엔드 §4-5 교차 접근 차단),
 * 이관이 소유권을 옮겨야 열린다. 이관과 상세 조회의 경쟁, 이관 1회 제한 도달을 검증한다.
 */
const CHAT_DETAIL = '**/api/v1/chats/c1';
const MIGRATE = '**/api/v1/auth/migrate';

const chatDetail = {
  id: 'c1',
  storyId: 's1',
  storyTitle: '용의 계곡',
  prologue: '안개 낀 계곡 앞에 한 용사가 섰다.',
  turns: [],
  suggestedInputs: [],
};

type MigrationState = {
  migrated: boolean;
  detailRequests: number;
  migrateRequests: number;
};

type SetupOptions = {
  /** true면 이관 1회 제한에 걸린 계정으로 응답한다(어떤 항목도 클레임되지 않음). */
  closed?: boolean;
  /** 첫 상세 조회 응답을 늦춰 이관 완료 시점에 in-flight로 겹치게 한다. */
  detailDelayMs?: number;
};

/**
 * 이관 전 403 → 이관 후 200으로 바뀌는 백엔드를 목킹한다.
 * 소유권 판정은 실제 백엔드와 같이 "요청 도착 시점" 상태로 고정한다.
 *
 * 검증 대상은 "상세 조회가 이관보다 먼저 도착해 403으로 확정되는" 경쟁이므로, 그 순서를
 * 우연에 맡기지 않고 이관 응답을 첫 상세 요청 도착까지 붙잡아 고정한다. 부하에 따라
 * 이관이 먼저 도착하면 첫 조회가 곧바로 200을 받아 경쟁 자체가 재현되지 않는다.
 *
 * @param page 대상 페이지
 * @param options 이관 잠금 여부와 상세 응답 지연
 * @returns 이관·조회 진행 상태(어서션용)
 */
const mockMigrationBackend = async (
  page: Page,
  { closed = false, detailDelayMs = 0 }: SetupOptions = {},
): Promise<MigrationState> => {
  const state: MigrationState = {
    migrated: false,
    detailRequests: 0,
    migrateRequests: 0,
  };

  let markDetailArrived = () => {};
  const detailArrived = new Promise<void>((resolve) => {
    markDetailArrived = resolve;
  });

  await page.route(MIGRATE, async (route) => {
    state.migrateRequests += 1;

    if (closed) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stories: [], chats: [], migrationClosed: true }),
      });

      return;
    }

    await detailArrived;

    state.migrated = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stories: [],
        chats: [{ id: 'c1', status: 'MIGRATED' }],
        migrationClosed: false,
      }),
    });
  });

  await page.route(CHAT_DETAIL, async (route) => {
    state.detailRequests += 1;

    const migratedAtArrival = state.migrated;

    markDetailArrived();

    if (detailDelayMs > 0 && state.detailRequests === 1) {
      await new Promise((resolve) => setTimeout(resolve, detailDelayMs));
    }

    if (!migratedAtArrival) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'forbidden' }),
      });

      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chatDetail),
    });
  });

  return state;
};

test.describe('로그인 직후 게스트 데이터 이관', () => {
  test('이관 전 403을 받은 채팅 상세는 이관 완료 후 자동으로 복구된다 (AUTH-MIGRATE-08)', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1']);
    await mockMemberSession(page);
    await mockMigrationBackend(page);

    await page.goto('/chats/c1');

    await expect(page.getByText(chatDetail.prologue)).toBeVisible();
  });

  test('상세 조회가 이관 완료 시점에 in-flight여도 복구된다 (AUTH-MIGRATE-08)', async ({
    page,
  }) => {
    // 상세 요청이 이관보다 먼저 도착해 403으로 확정되지만 응답은 이관 뒤에 도착한다.
    // 진행 중 요청에 무효화가 흡수되면 이관 전 403이 그대로 굳는다(KNK-611 회귀).
    await seedChatIds(page, ['c1']);
    await mockMemberSession(page);

    const state = await mockMigrationBackend(page, { detailDelayMs: 1500 });

    await page.goto('/chats/c1');

    await expect(page.getByText(chatDetail.prologue)).toBeVisible({
      timeout: 10_000,
    });
    // 흡수되지 않고 실제로 재조회가 일어났어야 한다.
    expect(state.detailRequests).toBeGreaterThan(1);
  });

  test('이관 1회 제한에 걸린 계정은 사유를 알리고 재시도를 권하지 않는다 (AUTH-MIGRATE-03)', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1']);
    await mockMemberSession(page);
    await mockMigrationBackend(page, { closed: true });

    await page.goto('/chats/c1');

    // 이관이 닫혀 채팅은 영영 403이다. 무의미한 "다시 시도" 대신 사유를 밝힌다.
    // 설명 문구는 다듬을 여지가 있어 상태를 구분하는 타이틀만 검증한다(정본은 QA 시트).
    await expect(page.getByText('지금 계정에서는 볼 수 없어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '다시 시도하기' }),
    ).toBeHidden();
    await expect(page.getByText('채팅을 불러오지 못했어요')).toBeHidden();
    // base-ui Button(render=Link)은 role="button"인 앵커라 button 역할로 잡힌다.
    await expect(
      page.getByRole('button', { name: '채팅 목록으로' }),
    ).toHaveAttribute('href', '/chats');
  });

  test('이관 1회 제한에 걸리면 사유를 토스트로 알리고, 로컬 ID를 유지한 채 재방문에는 재호출·재안내하지 않는다 (AUTH-MIGRATE-03)', async ({
    page,
  }) => {
    await seedChatIds(page, ['c1']);
    await mockMemberSession(page);

    const state = await mockMigrationBackend(page, { closed: true });

    await page.goto('/chats/c1');

    const closedToast = page.getByText(
      '이미 옮긴 적이 있어 이 기기의 스토리와 채팅은 옮기지 못했어요',
    );

    await expect(closedToast).toBeVisible();

    // 이관되지 못한 채팅은 NULL 소유로 살아 있고 로컬 ID가 유일한 손잡이라 지우지 않는다
    // (로그아웃하면 게스트 서재로 복원).
    const storedChatIds = await page.evaluate(() =>
      window.localStorage.getItem('manyak:created-chat-ids'),
    );

    expect(storedChatIds).toBe(JSON.stringify(['c1']));

    // 닫힘은 영구 상태 — 재방문에는 결과가 같은 재호출과 재안내를 만들지 않는다.
    await page.reload();
    await expect(page.getByText('지금 계정에서는 볼 수 없어요')).toBeVisible();
    await expect(closedToast).toBeHidden();
    expect(state.migrateRequests).toBe(1);
  });
});
