import type { Page } from '@playwright/test';

import { CREDIT_HISTORY_COPY } from '@/features/my/credits/constants';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

const ME_API = '**/api/v1/auth/me';
const TRANSACTIONS_API = '**/api/v1/users/me/credits/transactions*';

type Transaction = {
  type: 'EARN' | 'SPEND' | 'EXPIRE';
  reason: string;
  amount: number;
  title: string | null;
  expiresAt: string | null;
  createdAt: string;
};

const CHAT_TURN_TRANSACTION: Transaction = {
  type: 'SPEND',
  reason: 'CHAT_TURN',
  amount: -20,
  title: '유운잔검기',
  expiresAt: null,
  createdAt: '2026-08-31T09:00:00Z',
};

const ATTENDANCE_TRANSACTION: Transaction = {
  type: 'EARN',
  reason: 'ATTENDANCE_REWARD',
  amount: 350,
  title: null,
  expiresAt: '2026-09-30T00:00:00Z',
  createdAt: '2026-08-31T00:10:00Z',
};

const DELETED_STORY_TRANSACTION: Transaction = {
  type: 'SPEND',
  reason: 'STORY_CREATION',
  amount: -200,
  title: null,
  expiresAt: null,
  createdAt: '2026-08-30T09:00:00Z',
};

/** 잔액 정본인 프로필(GET /auth/me)을 목킹한다. */
async function mockMe(page: Page, creditBalance = 3160): Promise<void> {
  await page.route(ME_API, (route) =>
    route.fulfill({
      json: {
        id: 'user-1',
        nickname: '배고픈 송아지',
        profileImageUrl: null,
        profileThumbnailBase64: null,
        status: 'ACTIVE',
        creditBalance,
        attendedToday: false,
        linkedProviders: ['google'],
      },
    }),
  );
}

/** 커서별 응답을 목킹한다. 키는 요청의 cursor 값이고 첫 페이지는 빈 문자열이다. */
async function mockTransactions(
  page: Page,
  pages: Record<string, { items: Transaction[]; nextCursor: string | null }>,
): Promise<string[]> {
  const requestedCursors: string[] = [];

  await page.route(TRANSACTIONS_API, (route) => {
    const cursor =
      new URL(route.request().url()).searchParams.get('cursor') ?? '';

    requestedCursors.push(cursor);

    const body = pages[cursor];

    if (!body) {
      return route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR' } });
    }

    return route.fulfill({ json: body });
  });

  return requestedCursors;
}

async function prepareMember(page: Page): Promise<void> {
  await skipOnboarding(page);
  await mockMemberSession(page);
  await mockMe(page);
}

function createTransactions(count: number, prefix: string): Transaction[] {
  return Array.from({ length: count }, (_, index) => ({
    ...CHAT_TURN_TRANSACTION,
    title: `${prefix} ${index + 1}`,
  }));
}

test.describe('이프 내역 (/my/credits)', () => {
  test('게스트는 로그인 페이지로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my/credits');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('마이 이프 카드의 내역 버튼으로 진입한다', async ({ page }) => {
    await prepareMember(page);
    await mockTransactions(page, {
      '': { items: [CHAT_TURN_TRANSACTION], nextCursor: null },
    });
    await page.goto('/my');

    // Button + Link 조합은 nativeButton={false}로 렌더돼 접근성 역할이 button이다.
    await page
      .getByRole('button', { name: CREDIT_HISTORY_COPY.entryButton })
      .click();

    await expect(page).toHaveURL(/\/my\/credits$/);
    await expect(
      page.getByRole('banner').getByText(CREDIT_HISTORY_COPY.title),
    ).toBeVisible();
  });

  test('다시 진입하면 첫 페이지부터 새로 조회한다', async ({ page }) => {
    await prepareMember(page);

    const requestedCursors = await mockTransactions(page, {
      '': { items: [CHAT_TURN_TRANSACTION], nextCursor: null },
    });

    await page.goto('/my');

    await page
      .getByRole('button', { name: CREDIT_HISTORY_COPY.entryButton })
      .click();
    await expect(page.getByText('유운잔검기')).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(/\/my$/);

    await page
      .getByRole('button', { name: CREDIT_HISTORY_COPY.entryButton })
      .click();
    await expect(page.getByText('유운잔검기')).toBeVisible();

    expect(requestedCursors).toEqual(['', '']);
  });

  test('잔액과 내역 목록을 표시한다', async ({ page }) => {
    await prepareMember(page);
    await mockTransactions(page, {
      '': {
        items: [
          CHAT_TURN_TRANSACTION,
          ATTENDANCE_TRANSACTION,
          DELETED_STORY_TRANSACTION,
        ],
        nextCursor: null,
      },
    });
    await page.goto('/my/credits');

    await expect(page.getByText('3,160')).toBeVisible();

    await expect(page.getByText('채팅 전송')).toBeVisible();
    await expect(page.getByText('유운잔검기')).toBeVisible();
    await expect(page.getByText('-20', { exact: true })).toBeVisible();

    await expect(page.getByText('출석 체크 보상')).toBeVisible();
    await expect(page.getByText('+350', { exact: true })).toBeVisible();
    await expect(page.getByText('2026-08-31 · 2026-09-30 만료')).toBeVisible();

    await expect(page.getByText('스토리 완성')).toBeVisible();
    await expect(
      page.getByText(CREDIT_HISTORY_COPY.deletedStory),
    ).toBeVisible();
  });

  test('내역이 없으면 빈 상태를 표시한다', async ({ page }) => {
    await prepareMember(page);
    await mockTransactions(page, {
      '': { items: [], nextCursor: null },
    });
    await page.goto('/my/credits');

    await expect(page.getByText(CREDIT_HISTORY_COPY.empty)).toBeVisible();
  });

  test('첫 조회 실패는 목록 자리에서 다시 시도할 수 있다', async ({ page }) => {
    await prepareMember(page);

    let shouldFail = true;

    await page.route(TRANSACTIONS_API, (route) => {
      if (shouldFail) {
        shouldFail = false;

        return route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR' } });
      }

      return route.fulfill({
        json: { items: [CHAT_TURN_TRANSACTION], nextCursor: null },
      });
    });

    await page.goto('/my/credits');

    await expect(page.getByText(CREDIT_HISTORY_COPY.loadFailed)).toBeVisible();

    await page.getByRole('button', { name: CREDIT_HISTORY_COPY.retry }).click();

    await expect(page.getByText('유운잔검기')).toBeVisible();
    await expect(page.getByText(CREDIT_HISTORY_COPY.loadFailed)).toBeHidden();
  });

  test('목록 끝에 닿으면 다음 커서로 이어 붙인다', async ({ page }) => {
    await prepareMember(page);

    const requestedCursors = await mockTransactions(page, {
      '': {
        items: createTransactions(20, '첫 페이지'),
        nextCursor: 'cursor-2',
      },
      'cursor-2': {
        items: createTransactions(5, '다음 페이지'),
        nextCursor: null,
      },
    });

    await page.goto('/my/credits');

    await expect(page.getByText('첫 페이지 1', { exact: true })).toBeVisible();
    await expect(page.getByText('다음 페이지 1', { exact: true })).toBeHidden();

    await page.getByRole('listitem').last().scrollIntoViewIfNeeded();

    await expect(page.getByText('다음 페이지 5')).toBeVisible();
    expect(requestedCursors).toEqual(['', 'cursor-2']);
  });

  test('다음 페이지 조회 실패는 이미 그린 목록을 지우지 않는다', async ({
    page,
  }) => {
    await prepareMember(page);

    let shouldFailNextPage = true;

    await page.route(TRANSACTIONS_API, (route) => {
      const cursor =
        new URL(route.request().url()).searchParams.get('cursor') ?? '';

      if (cursor === '') {
        return route.fulfill({
          json: {
            items: createTransactions(20, '첫 페이지'),
            nextCursor: 'cursor-2',
          },
        });
      }

      if (shouldFailNextPage) {
        shouldFailNextPage = false;

        return route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR' } });
      }

      return route.fulfill({
        json: { items: createTransactions(5, '다음 페이지'), nextCursor: null },
      });
    });

    await page.goto('/my/credits');
    await page.getByRole('listitem').last().scrollIntoViewIfNeeded();

    await expect(
      page.getByRole('button', { name: CREDIT_HISTORY_COPY.retry }),
    ).toBeVisible();
    await expect(page.getByText('첫 페이지 1', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: CREDIT_HISTORY_COPY.retry }).click();

    await expect(page.getByText('다음 페이지 5')).toBeVisible();
  });
});
