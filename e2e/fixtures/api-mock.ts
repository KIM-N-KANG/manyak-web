import type { Page } from '@playwright/test';

import type {
  CreditPolicyResponse,
  CreditProductResponse,
  TrialsResponse,
  UserConsentResponse,
} from '@/api/generated/models';

/**
 * 모든 백엔드 호출은 /api/[...path] 프록시를 거친다.
 * 스모크(빈 상태)에선 목록 API가 호출되지 않지만, 어떤 요청도 실서버로 새지 않도록 가로챈다.
 * 구체 응답이 필요한 테스트는 이 함수 호출 뒤 page.route를 추가 등록해 override한다.
 */
export async function mockApi(page: Page): Promise<void> {
  // page.route는 나중에 등록한 핸들러가 먼저 매칭되므로, 더 구체적인 라우트를
  // 나중에 등록해야 우선 적용된다.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  // NextAuth 세션 조회는 미인증 시 `null`을 응답한다(실서버 확인 완료).
  // 회원 시나리오는 mockMemberSession()이 이 라우트를 override한다.
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });

  // 이프 수치 문구는 공개 정책 조회를 따라간다. 목이 없으면 catch-all의 `[]`가 내려가
  // 모든 수치가 자리표시(000)로 그려지므로, 픽스처 수치를 응답해 문구를 결정적으로 만든다.
  await mockCreditPolicies(page);

  // 체험 잔여 문구는 서버 체험 조회를 따라간다. 목이 없으면 catch-all의 `[]`가
  // 내려가 잔여가 자리표시로 남으므로, 모든 체험이 남은 상태를 기본으로 응답한다.
  await mockTrials(page);

  // 회원 기능은 필수 동의 조회가 끝나야 열린다. 기본은 모두 동의한 상태로 응답해
  // 회원 시나리오가 동의 시트 없이 진행되게 한다. 동의 시나리오는 이 목을 override한다.
  await mockConsents(page);
  await mockGuestConsents(page);
}

export const GUEST_CONSENT_VERSION_FIXTURE = 'guest-v1';

/**
 * 기기별 게스트 동의 조회와 저장을 목킹한다.
 * @param page 대상 페이지
 * @param needsConsent 처음 조회 시 동의 필요 여부
 */
export async function mockGuestConsents(
  page: Page,
  needsConsent = true,
): Promise<void> {
  const cookieName = 'AMP_guest_e2e';

  if (
    !(await page.context().cookies()).some(({ name }) => name === cookieName)
  ) {
    await page.context().addCookies([
      {
        name: cookieName,
        value: btoa(
          encodeURIComponent(JSON.stringify({ deviceId: crypto.randomUUID() })),
        ),
        domain: 'localhost',
        path: '/',
      },
    ]);
  }

  const acceptedDevices = new Set<string>();

  await page.route('**/api/v1/guests/consents', async (route) => {
    const request = route.request();
    const deviceId = request.headers()['x-manyak-device-id'];

    if (!deviceId) {
      await route.fulfill({ status: 400, json: {} });

      return;
    }

    if (request.method() === 'POST') {
      if (
        request.postDataJSON().guestPrivacy !== GUEST_CONSENT_VERSION_FIXTURE
      ) {
        await route.fulfill({
          status: 400,
          json: { code: 'CONSENT_VERSION_MISMATCH' },
        });

        return;
      }

      acceptedDevices.add(deviceId);
    }

    await route.fulfill({
      json: {
        guestPrivacy: {
          requiredVersion: GUEST_CONSENT_VERSION_FIXTURE,
          needsConsent: needsConsent && !acceptedDevices.has(deviceId),
        },
      },
    });
  });
}

/** 필수 동의 조회·기록(GET/POST /api/v1/users/me/consents) 라우트 글롭. */
const CONSENTS_ROUTE = '**/api/v1/users/me/consents';

/** E2E가 응답할 동의 상태. 세 항목 모두 현행 버전에 동의한 상태다. */
export const CONSENTS_FIXTURE = {
  terms: { requiredVersion: 'v1.2', needsConsent: false },
  privacy: { requiredVersion: 'v1.4', needsConsent: false },
  age14: { requiredVersion: '1', needsConsent: false },
} as const satisfies Required<UserConsentResponse>;

/**
 * 필수 동의 조회를 목킹한다. 항목별 `needsConsent`를 덮어써 동의 시트가 뜨는 상태를 재현한다.
 * 기록(POST)은 별도로 목킹하지 않으면 같은 응답을 돌려준다.
 *
 * @param page 대상 페이지
 * @param overrides 기본 픽스처 위에 덮어쓸 항목
 */
export async function mockConsents(
  page: Page,
  overrides: Partial<UserConsentResponse> = {},
): Promise<void> {
  await page.route(CONSENTS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...CONSENTS_FIXTURE, ...overrides }),
    });
  });
}

/** 체험 사용량·한도 조회(GET /api/v1/users/me/trials) 라우트 글롭. */
const TRIALS_ROUTE = '**/api/v1/users/me/trials';

/**
 * E2E가 응답할 체험 사용량·한도. 모든 항목이 하나도 쓰이지 않은 상태이며, 한도 수치는
 * 백엔드 정책(스토리라인 5·스토리 1·채팅 5·이미지 5)을 따른다.
 */
export const TRIALS_FIXTURE = {
  chatTurn: { used: 0, limit: 5 },
  chatImage: { used: 0, limit: 5 },
  storyCreation: { used: 0, limit: 1 },
  storylineGeneration: { used: 0, limit: 5 },
} as const satisfies Required<TrialsResponse>;

/**
 * 체험 사용량·한도 조회를 목킹한다. 항목별 사용량을 덮어써 한도 도달 상태의 선차단이나
 * 회원의 체험 소진 후 이프 비용 표시를 재현한다.
 *
 * @param page 대상 페이지
 * @param overrides 기본 픽스처 위에 덮어쓸 항목
 */
export async function mockTrials(
  page: Page,
  overrides: Partial<TrialsResponse> = {},
): Promise<void> {
  await page.route(TRIALS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...TRIALS_FIXTURE, ...overrides }),
    });
  });
}

/** 모든 체험 항목을 소진한 응답. 회원의 이프 비용 표시 검증에 쓴다. */
export const EXHAUSTED_TRIALS: Required<TrialsResponse> = {
  chatTurn: { used: 5, limit: 5 },
  chatImage: { used: 5, limit: 5 },
  storyCreation: { used: 1, limit: 1 },
  storylineGeneration: { used: 5, limit: 5 },
};

/** 이프 정책 조회(GET /api/v1/credits/policies) 라우트 글롭. */
const CREDIT_POLICIES_ROUTE = '**/api/v1/credits/policies';

/**
 * E2E가 응답할 이프 정책 수치. 앱에는 기본 수치가 없으므로 이 값이 화면 문구의 정본이며,
 * 스펙은 기대 문구도 이 값에서 만든다.
 */
export const CREDIT_POLICY_FIXTURE = {
  signupReward: 1_000,
  inviteReward: 2_000,
  inviteMonthlyCap: 10,
  attendanceReward: 700,
  storyCreationCost: 200,
  chatTurnCost: 20,
  chatImageCost: 30,
} as const satisfies Required<CreditPolicyResponse>;

/**
 * 이프 적립·소모 수치 조회를 목킹한다. 값을 바꿔 넘기면 화면 문구가 서버 값을 따르는지 검증할 수 있다.
 *
 * @param page 대상 페이지
 * @param policy 응답할 정책 수치
 */
export async function mockCreditPolicies(
  page: Page,
  policy: CreditPolicyResponse = CREDIT_POLICY_FIXTURE,
): Promise<void> {
  await page.route(CREDIT_POLICIES_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(policy),
    });
  });
}

/** 이프 충전 상품 목록(GET /api/v1/credits/products) 라우트 글롭. */
const CREDIT_PRODUCTS_ROUTE = '**/api/v1/credits/products';

/** E2E가 응답할 이프 충전 상품. 두 번째 상품만 보너스를 둬 보조 문구 유무를 함께 검증한다. */
export const CREDIT_PRODUCTS_FIXTURE = [
  {
    productId: 'credit_200',
    baseCredits: 200,
    bonusCredits: 0,
    totalCredits: 200,
    webPriceKrw: 2_000,
    appPriceKrw: 2_500,
  },
  {
    productId: 'credit_1000',
    baseCredits: 1_000,
    bonusCredits: 100,
    totalCredits: 1_100,
    webPriceKrw: 10_000,
    appPriceKrw: 12_000,
  },
] as const satisfies readonly Required<CreditProductResponse>[];

/**
 * 이프 충전 상품 목록 조회를 목킹한다.
 *
 * @param page 대상 페이지
 * @param items 응답할 상품 목록
 */
export async function mockCreditProducts(
  page: Page,
  items: readonly CreditProductResponse[] = CREDIT_PRODUCTS_FIXTURE,
): Promise<void> {
  await page.route(CREDIT_PRODUCTS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items }),
    });
  });
}

/** 핸드오프 상태 조회(GET /api/v1/auth/handoffs/status) 라우트 글롭. */
const HANDOFF_STATUS_ROUTE = '**/api/v1/auth/handoffs/status';
/** 외부 랜딩의 쿠키 이전 BFF(POST /api/auth/handoff-session) 라우트 글롭. */
const HANDOFF_SESSION_ROUTE = '**/api/auth/handoff-session';

/**
 * 외부 랜딩의 쿠키 이전 BFF를 목킹한다. 200이면 안내 요약을, 404면 만료를 재현한다.
 * 실제 라우트는 백엔드로 나가므로 E2E에서는 브라우저 레벨에서 가로챈다.
 *
 * @param page 대상 페이지
 * @param options 응답 status와 안내 요약 body(만료 재현 시 status만 404)
 */
export async function mockHandoffSession(
  page: Page,
  options: {
    status?: number;
    body?: { storyCount: number; chatCount: number; callbackPath: string };
  } = {},
): Promise<void> {
  const {
    status = 200,
    body = { storyCount: 1, chatCount: 1, callbackPath: '/' },
  } = options;

  await page.route(HANDOFF_SESSION_ROUTE, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body:
        status === 200
          ? JSON.stringify(body)
          : JSON.stringify({ error: 'gone' }),
    });
  });
}

/**
 * 핸드오프 상태 조회를 목킹한다(인앱 복귀 정리가 소비).
 *
 * @param page 대상 페이지
 * @param body 상태와 이관된 공개 ID 목록
 */
export async function mockHandoffStatus(
  page: Page,
  body: {
    status: 'PENDING' | 'LANDED' | 'MIGRATED' | 'MIGRATION_CLOSED';
    migratedStoryIds?: string[];
    migratedChatIds?: string[];
  },
): Promise<void> {
  await page.route(HANDOFF_STATUS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/** 공유 열람(GET /api/v1/shares/{shareId}) 라우트 글롭. */
const CHAT_SHARE_VIEW_ROUTE = '**/api/v1/shares/*';
/** 공유 발급(POST /api/v1/chats/{chatId}/shares) 라우트 글롭. */
const CHAT_SHARE_CREATE_ROUTE = '**/api/v1/chats/*/shares';

/**
 * 공유 열람 API를 목킹한다. status를 404로 주면 없는 링크 화면을 검증할 수 있다.
 *
 * @param page 대상 페이지
 * @param body 반환할 공유본
 * @param status 응답 상태(기본 200)
 */
export async function mockChatShareView(
  page: Page,
  body: unknown,
  status = 200,
): Promise<void> {
  await page.route(CHAT_SHARE_VIEW_ROUTE, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

/**
 * 공유 발급 API를 201로 목킹한다.
 *
 * @param page 대상 페이지
 * @param shareId 반환할 공유 열람 토큰
 */
export async function mockChatShareCreate(
  page: Page,
  shareId: string,
): Promise<void> {
  await page.route(CHAT_SHARE_CREATE_ROUTE, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        shareId,
        turnCount: 1,
        createdAt: '2026-07-29T00:00:00Z',
      }),
    });
  });
}
