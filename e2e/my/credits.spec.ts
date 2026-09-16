import type { Page } from '@playwright/test';

import { formatCreditAmount } from '@/constants/credit';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  buildAttendanceTitleLines,
  buildCreditBonusLabel,
  buildCreditProductLabel,
  CREDIT_CHARGE_COPY,
  CREDIT_HISTORY_COPY,
  CREDIT_ORDER_COPY,
  CREDIT_PURCHASE_COPY,
  formatKrwPrice,
} from '@/features/my/credits/constants';
import { PENDING_CREDIT_ORDER_STORAGE_KEY } from '@/features/my/credits/utils/pending-credit-order-storage';

import {
  CREDIT_POLICY_FIXTURE,
  CREDIT_PRODUCTS_FIXTURE,
  expect,
  mockCreditPolicies,
  mockCreditProducts,
  mockMemberSession,
  seedPendingCreditOrder,
  skipOnboarding,
  test,
} from '../fixtures/test';

const ME_API = '**/api/v1/auth/me';
const TRANSACTIONS_API = '**/api/v1/users/me/credits/transactions*';
const ATTENDANCE_API = '**/api/v1/users/me/credits/attendance';
const PRODUCTS_API = '**/api/v1/credits/products';
const ORDERS_API = '**/api/v1/users/me/credits/orders';
const ORDER_API = '**/api/v1/users/me/credits/orders/order-1';
/** 그로블 결제창을 대신하는 외부 주소. 이동만 확인하면 되므로 빈 문서를 응답한다. */
const PAYMENT_URL = 'https://pay.example.test/checkout?ref=order-1';

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
async function mockMe(
  page: Page,
  { creditBalance = 3160, attendedToday = false } = {},
): Promise<void> {
  await page.route(ME_API, (route) =>
    route.fulfill({
      json: {
        id: 'user-1',
        nickname: '배고픈 송아지',
        profileImageUrl: null,
        profileThumbnailBase64: null,
        status: 'ACTIVE',
        creditBalance,
        attendedToday,
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

async function prepareMember(
  page: Page,
  options?: { creditBalance?: number; attendedToday?: boolean },
): Promise<void> {
  await skipOnboarding(page);
  await mockMemberSession(page);
  await mockMe(page, options);
  await mockCreditProducts(page);
}

/** 진입 직후에는 구매 탭이라, 무료 충전·내역 케이스는 해당 탭으로 옮겨 놓고 검증한다. */
async function openFreeChargeTab(page: Page): Promise<void> {
  await page
    .getByRole('tab', { name: CREDIT_CHARGE_COPY.freeChargeTab })
    .click();
}

async function openHistoryTab(page: Page): Promise<void> {
  await page.getByRole('tab', { name: CREDIT_CHARGE_COPY.historyTab }).click();
}

function createTransactions(count: number, prefix: string): Transaction[] {
  return Array.from({ length: count }, (_, index) => ({
    ...CHAT_TURN_TRANSACTION,
    title: `${prefix} ${index + 1}`,
  }));
}

test.describe('이프 충전 (/my/credits)', () => {
  test('게스트는 로그인 페이지로 이동한다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/my/credits');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('마이 이프 카드의 충전 버튼으로 진입한다', async ({ page }) => {
    await prepareMember(page);
    await page.goto('/my');

    // Button + Link 조합은 nativeButton={false}로 렌더돼 접근성 역할이 button이다.
    await page
      .getByRole('button', { name: CREDIT_CHARGE_COPY.entryButton })
      .click();

    await expect(page).toHaveURL(/\/my\/credits$/);
    await expect(
      page.getByRole('banner').getByText(CREDIT_CHARGE_COPY.title),
    ).toBeVisible();
    // 진입 기본 탭은 구매다.
    await expect(
      page.getByRole('tab', { name: CREDIT_CHARGE_COPY.purchaseTab }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('button', {
        name: formatKrwPrice(CREDIT_PRODUCTS_FIXTURE[0].webPriceKrw),
      }),
    ).toBeVisible();
  });

  test('구매 탭에 상품 목록과 웹 가격을 표시한다', async ({ page }) => {
    await prepareMember(page);
    await page.goto('/my/credits');

    const [plain, withBonus] = CREDIT_PRODUCTS_FIXTURE;
    const rows = page.getByRole('listitem');

    await expect(rows).toHaveCount(CREDIT_PRODUCTS_FIXTURE.length);
    await expect(
      rows.nth(0).getByText(buildCreditProductLabel(plain.baseCredits)),
    ).toBeVisible();
    await expect(
      rows.nth(0).getByRole('button', {
        name: formatKrwPrice(plain.webPriceKrw),
      }),
    ).toBeVisible();
    // 보너스가 없는 상품은 보조 문구를 그리지 않는다.
    await expect(rows.nth(0).getByText(/^\+/)).toHaveCount(0);
    await expect(
      rows.nth(1).getByText(buildCreditProductLabel(withBonus.baseCredits)),
    ).toBeVisible();
    await expect(
      rows.nth(1).getByText(buildCreditBonusLabel(withBonus.bonusCredits)),
    ).toBeVisible();
    // 앱 가격은 웹에 노출하지 않는다.
    await expect(page.getByText(formatKrwPrice(plain.appPriceKrw))).toHaveCount(
      0,
    );
    await expect(page.getByText(CREDIT_PURCHASE_COPY.note)).toBeVisible();
  });

  test('상품을 고르면 주문을 만들고 결제창으로 이동한다', async ({ page }) => {
    await prepareMember(page);

    const orderBodies: unknown[] = [];

    await page.route(ORDERS_API, (route) => {
      orderBodies.push(route.request().postDataJSON());

      return route.fulfill({
        status: 201,
        json: { orderId: 'order-1', paymentUrl: PAYMENT_URL },
      });
    });
    await page.route(PAYMENT_URL, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>pay</title>' }),
    );

    await page.goto('/my/credits');

    const [, withBonus] = CREDIT_PRODUCTS_FIXTURE;

    await page
      .getByRole('button', { name: formatKrwPrice(withBonus.webPriceKrw) })
      .click();

    await expect(page).toHaveURL(PAYMENT_URL);
    expect(orderBodies).toEqual([{ productId: withBonus.productId }]);

    // 나가기 전에 남긴 주문으로 돌아오자마자 확인을 시작한다.
    await mockOrder(page, [{ status: 'COMPLETED' }]);
    await page.goto('/my/credits');

    await expect(
      page
        .getByRole('status', { name: CREDIT_ORDER_COPY.title })
        .getByText(CREDIT_ORDER_COPY.completed(formatCreditAmount(1_100))),
    ).toBeVisible();
  });

  test('주문 생성이 실패하면 안내 토스트를 띄우고 다시 누를 수 있다', async ({
    page,
  }) => {
    await prepareMember(page);
    await page.route(ORDERS_API, (route) =>
      route.fulfill({ status: 503, json: { code: 'PAYMENT_UNAVAILABLE' } }),
    );

    await page.goto('/my/credits');

    const [plain] = CREDIT_PRODUCTS_FIXTURE;
    const button = page.getByRole('button', {
      name: formatKrwPrice(plain.webPriceKrw),
    });

    await button.click();

    await expect(
      page.getByText(TOAST_MESSAGE.CREDIT_ORDER_FAILED),
    ).toBeVisible();
    await expect(button).toBeEnabled();
    await expect(page).toHaveURL(/\/my\/credits$/);
  });

  test('상품 조회 실패는 목록 자리에서 다시 시도할 수 있다', async ({
    page,
  }) => {
    await prepareMember(page);

    let requestCount = 0;

    await page.route(PRODUCTS_API, (route) => {
      requestCount += 1;

      if (requestCount === 1) {
        return route.fulfill({ status: 500, json: { code: 'INTERNAL_ERROR' } });
      }

      return route.fulfill({ json: { items: CREDIT_PRODUCTS_FIXTURE } });
    });

    await page.goto('/my/credits');

    await expect(page.getByText(CREDIT_PURCHASE_COPY.loadFailed)).toBeVisible();

    await page
      .getByRole('button', { name: CREDIT_PURCHASE_COPY.retry })
      .click();

    await expect(
      page.getByRole('button', {
        name: formatKrwPrice(CREDIT_PRODUCTS_FIXTURE[0].webPriceKrw),
      }),
    ).toBeVisible();
    expect(requestCount).toBe(2);
  });

  /** 주문 조회를 응답 순서대로 목킹한다. 마지막 응답은 이후 조회에도 반복된다. */
  async function mockOrder(
    page: Page,
    responses: Array<
      | { status: 'PENDING' | 'COMPLETED' | 'REFUNDED' }
      | { httpStatus: 404 | 500 }
    >,
  ): Promise<() => number> {
    let count = 0;

    await page.route(ORDER_API, (route) => {
      const response = responses[Math.min(count, responses.length - 1)];

      count += 1;

      if ('httpStatus' in response) {
        return route.fulfill({
          status: response.httpStatus,
          json: { code: response.httpStatus === 404 ? 'NOT_FOUND' : 'ERROR' },
        });
      }

      return route.fulfill({
        json: {
          orderId: 'order-1',
          productId: 'credit_1000',
          status: response.status,
          totalCredits: 1_100,
          createdAt: '2026-09-16T04:00:00Z',
          completedAt: null,
        },
      });
    });

    return () => count;
  }

  test('결제창에서 돌아오면 주문을 폴링해 충전 완료를 알리고 잔액을 갱신한다', async ({
    page,
  }) => {
    await prepareMember(page);
    await seedPendingCreditOrder(page, 'order-1');

    let completed = false;

    await page.route(ME_API, (route) =>
      route.fulfill({
        json: {
          id: 'user-1',
          nickname: '배고픈 송아지',
          profileImageUrl: null,
          profileThumbnailBase64: null,
          status: 'ACTIVE',
          creditBalance: completed ? 4_260 : 3_160,
          attendedToday: false,
          linkedProviders: ['google'],
        },
      }),
    );
    await page.route(ORDER_API, (route) => {
      const status = completed ? 'COMPLETED' : 'PENDING';

      completed = true;

      return route.fulfill({
        json: { orderId: 'order-1', status, totalCredits: 1_100 },
      });
    });

    await page.goto('/my/credits');

    const card = page.getByRole('status', { name: CREDIT_ORDER_COPY.title });

    await expect(card.getByText(CREDIT_ORDER_COPY.checking)).toBeVisible();
    await expect(
      card.getByText(CREDIT_ORDER_COPY.completed(formatCreditAmount(1_100))),
    ).toBeVisible();
    await expect(page.getByText('4,260')).toBeVisible();

    await card.getByRole('button', { name: CREDIT_ORDER_COPY.dismiss }).click();

    await expect(card).toBeHidden();
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key),
        PENDING_CREDIT_ORDER_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  test('돌아온 주문이 없는 주문이면 확인 불가를 알린다', async ({ page }) => {
    await prepareMember(page);
    await seedPendingCreditOrder(page, 'order-1');
    await mockOrder(page, [{ httpStatus: 404 }]);

    await page.goto('/my/credits');

    const card = page.getByRole('status', { name: CREDIT_ORDER_COPY.title });

    await expect(card.getByText(CREDIT_ORDER_COPY.notFound)).toBeVisible();
    await expect(
      card.getByRole('button', { name: CREDIT_ORDER_COPY.retry }),
    ).toHaveCount(0);
  });

  test('주문 조회가 실패하면 다시 확인으로 폴링을 재개한다', async ({
    page,
  }) => {
    await prepareMember(page);
    await seedPendingCreditOrder(page, 'order-1');

    const requestCount = await mockOrder(page, [
      { httpStatus: 500 },
      { status: 'REFUNDED' },
    ]);

    await page.goto('/my/credits');

    const card = page.getByRole('status', { name: CREDIT_ORDER_COPY.title });

    await expect(card.getByText(CREDIT_ORDER_COPY.failed)).toBeVisible();
    // 실패로 멈춘 뒤에는 자동으로 다시 묻지 않는다.
    await page.waitForTimeout(2_500);
    expect(requestCount()).toBe(1);

    await card.getByRole('button', { name: CREDIT_ORDER_COPY.retry }).click();

    await expect(card.getByText(CREDIT_ORDER_COPY.refunded)).toBeVisible();
  });

  test('대기 주문이 없으면 확인 카드를 그리지 않는다', async ({ page }) => {
    await prepareMember(page);
    await page.goto('/my/credits');

    await expect(page.getByRole('button', { name: '2,000원' })).toBeVisible();
    await expect(
      page.getByRole('status', { name: CREDIT_ORDER_COPY.title }),
    ).toHaveCount(0);
  });

  test('다시 진입하면 첫 페이지부터 새로 조회한다', async ({ page }) => {
    await prepareMember(page);

    const requestedCursors = await mockTransactions(page, {
      '': { items: [CHAT_TURN_TRANSACTION], nextCursor: null },
    });

    await page.goto('/my');

    await page
      .getByRole('button', { name: CREDIT_CHARGE_COPY.entryButton })
      .click();
    await openHistoryTab(page);
    await expect(page.getByText('유운잔검기')).toBeVisible();

    await page
      .getByRole('button', { name: '이전 페이지로 돌아가기 버튼' })
      .click();
    await expect(page).toHaveURL(/\/my$/);

    await page
      .getByRole('button', { name: CREDIT_CHARGE_COPY.entryButton })
      .click();
    await openHistoryTab(page);
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

    await openHistoryTab(page);

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
    await openHistoryTab(page);

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
    await openHistoryTab(page);

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
    await openHistoryTab(page);

    await expect(page.getByText('첫 페이지 1', { exact: true })).toBeVisible();
    await expect(page.getByText('다음 페이지 1', { exact: true })).toBeHidden();

    await page.getByRole('listitem').last().scrollIntoViewIfNeeded();

    await expect(page.getByText('다음 페이지 5')).toBeVisible();
    expect(requestedCursors).toEqual(['', 'cursor-2']);
  });

  test('무료 충전 탭에서 출석 보상을 받는다', async ({ page }) => {
    await prepareMember(page);

    let attendedToday = false;

    await page.route(ATTENDANCE_API, (route) => {
      attendedToday = true;

      return route.fulfill({ json: { rewarded: true, amount: 700 } });
    });
    // 출석 성공은 me를 무효화하므로, 재조회에서는 출석 완료 상태가 와야 한다.
    await page.route(ME_API, (route) =>
      route.fulfill({
        json: {
          id: 'user-1',
          nickname: '배고픈 송아지',
          profileImageUrl: null,
          profileThumbnailBase64: null,
          status: 'ACTIVE',
          creditBalance: attendedToday ? 3860 : 3160,
          attendedToday,
          linkedProviders: ['google'],
        },
      }),
    );

    await page.goto('/my/credits');
    await openFreeChargeTab(page);

    await page
      .getByRole('button', { name: CREDIT_CHARGE_COPY.attendanceButton })
      .click();

    await expect(
      page.getByText(TOAST_MESSAGE.ATTENDANCE_CLAIMED(700)),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: CREDIT_CHARGE_COPY.attendanceDoneButton,
      }),
    ).toBeDisabled();
    await expect(page.getByText('3,860')).toBeVisible();
  });

  test('출석 보상 문구는 서버가 내려준 이프 수치를 따라간다', async ({
    page,
  }) => {
    await prepareMember(page);
    // 픽스처 기본값과 다른 값을 응답해야 서버를 따라간다는 것이 드러난다.
    await mockCreditPolicies(page, {
      ...CREDIT_POLICY_FIXTURE,
      attendanceReward: 350,
    });

    await page.goto('/my/credits');
    await openFreeChargeTab(page);

    const [, rewardLine] = buildAttendanceTitleLines(formatCreditAmount(350));

    await expect(page.getByText(rewardLine)).toBeVisible();
  });

  test('정책 조회가 실패하면 출석 문구를 자리표시 숫자와 쉬머로 그린다', async ({
    page,
  }) => {
    await prepareMember(page);
    await page.route('**/api/v1/credits/policies', (route) =>
      route.fulfill({ status: 500, json: {} }),
    );

    await page.goto('/my/credits');
    await openFreeChargeTab(page);

    const [, rewardLine] = buildAttendanceTitleLines(
      formatCreditAmount(undefined),
    );
    const title = page.getByRole('heading', { name: rewardLine });

    await expect(title).toBeVisible();
    await expect(title).toHaveClass(/animate-pulse/);
  });

  test('이미 출석한 날에는 출석 버튼이 비활성이다', async ({ page }) => {
    await prepareMember(page, { attendedToday: true });
    await page.goto('/my/credits');
    await openFreeChargeTab(page);

    await expect(
      page.getByRole('button', {
        name: CREDIT_CHARGE_COPY.attendanceDoneButton,
      }),
    ).toBeDisabled();
  });

  test('무료 충전 탭의 친구 초대로 이동한다', async ({ page }) => {
    await prepareMember(page);
    await page.goto('/my/credits');
    await openFreeChargeTab(page);

    await page.getByRole('link', { name: /친구 초대/ }).click();

    await expect(page).toHaveURL(/\/my\/invite$/);
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
    await openHistoryTab(page);
    await page
      .getByText('첫 페이지 20', { exact: true })
      .scrollIntoViewIfNeeded();

    await expect(
      page.getByRole('button', { name: CREDIT_HISTORY_COPY.retry }),
    ).toBeVisible();
    await expect(page.getByText('첫 페이지 1', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: CREDIT_HISTORY_COPY.retry }).click();

    await expect(page.getByText('다음 페이지 5')).toBeVisible();
  });
});
