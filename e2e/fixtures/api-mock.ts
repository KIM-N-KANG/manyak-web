import type { Page } from '@playwright/test';

import type { CreditPolicyResponse } from '@/api/generated/models';

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
}

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

/** 핸드오프 생성(POST /api/v1/auth/handoffs) 라우트 글롭. 상태 조회(/status)와 경로가 갈린다. */
const HANDOFF_CREATE_ROUTE = '**/api/v1/auth/handoffs';
/** 핸드오프 상태 조회(GET /api/v1/auth/handoffs/status) 라우트 글롭. */
const HANDOFF_STATUS_ROUTE = '**/api/v1/auth/handoffs/status';
/** 외부 랜딩의 쿠키 이전 BFF(POST /api/auth/handoff-session) 라우트 글롭. */
const HANDOFF_SESSION_ROUTE = '**/api/auth/handoff-session';

/**
 * 핸드오프 생성 API를 201로 목킹한다(인앱 로그인 분기가 소비).
 * mockApi 뒤에 등록해야 catch-all보다 우선 적용된다.
 *
 * @param page 대상 페이지
 * @param body 반환할 생성 결과(핸드오프 코드·id)
 */
export async function mockHandoffCreate(
  page: Page,
  body: { handoffCode: string; handoffId: string } = {
    handoffCode: 'handoff-code-1',
    handoffId: 'handoff-id-1',
  },
): Promise<void> {
  await page.route(HANDOFF_CREATE_ROUTE, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ...body, expiresAt: '2099-01-01T00:00:00Z' }),
    });
  });
}

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
