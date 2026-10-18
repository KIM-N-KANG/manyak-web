import type { Page } from '@playwright/test';

import type {
  ArtStyleCatalogItem,
  CreditPolicyResponse,
  CreditProductResponse,
  GenerateSimpleStorylinesResponse,
  GenreCatalogResponse,
  PushSettingsResponse,
  PutStoryDraftRequest,
  TrialsResponse,
  UserConsentResponse,
} from '@/api/generated/models';
import {
  SIGNUP_CONSENT_ENDPOINT,
  type SignupConsentSummary,
} from '@/lib/auth/signup-consent';

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

  // 가입 동의 대기는 기본으로 없다(404). catch-all의 `[]`가 대기 요약으로 읽히지 않게 한다.
  await mockSignupConsent(page, null);

  // 제작 화면의 장르 칩과 검색은 제공 장르 조회를 따라간다. 스펙의 간편 제작 태그 목과 같은 id 1 판타지를
  // 대표로 두고, 나머지는 인물 특징 태그 id와 겹치지 않게 둔다. 다른 목록은 스펙에서 override한다.
  await mockGenreCatalog(page);

  // 간편 제작 추가 정보 단계의 화풍 선택은 제공 화풍 조회를 따라간다. catch-all의 `[]`면 선택지가 비므로
  // 기본 목록을 응답한다. 미리보기 이미지는 외부 CDN 요청을 막으려고 비워 둔다.
  await mockArtStyleCatalog(page);

  // 회원 세션은 루트의 토큰 동기화·프롬프트가 알림 API를 부를 수 있다. 기본 설정과 204를
  // 응답해 어떤 시나리오도 catch-all의 `[]`로 깨지지 않게 한다. 설정 시나리오는 override한다.
  await mockPushTokens(page);
  await mockPushSettings(page);

  // 회원 일반 제작의 임시 저장은 서버에 보관한다. 빈 서버 저장소로 시작해 저장과 재개가 실제 계약대로 오가게 한다.
  // 저장소를 들여다보거나 미리 채우는 스펙은 mockStoryDrafts를 다시 불러 새 핸들을 얻는다.
  await mockStoryDrafts(page);
}

/** 서버 임시 저장 목에 보관하는 초안이다. 응답의 미리보기 URL은 이 값으로 만든다. */
export type StoredStoryDraft = PutStoryDraftRequest & {
  draftId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * 서버 임시 저장 목의 상태다. 스펙에서 저장 결과를 단언하거나 다른 기기의 저장을 흉내 낼 때 직접 바꾼다.
 * `generations`는 간편 제작 스토리라인 초안이 연결한 생성 요청 ID별 생성 결과이며, 상세 응답의 `generation`이 된다.
 */
export type StoryDraftMock = {
  drafts: Map<string, StoredStoryDraft>;
  puts: { draftId: string; body: PutStoryDraftRequest }[];
  generations: Map<string, GenerateSimpleStorylinesResponse>;
};

/** 목이 돌려주는 초안 이미지 미리보기 URL의 앞부분이다. */
export const STORY_DRAFT_IMAGE_BASE = 'https://images.test';

const STORY_DRAFTS_ROUTE = '**/api/v1/users/me/story-drafts';

const STORY_DRAFT_ROUTE = '**/api/v1/users/me/story-drafts/*';

/** 백엔드 스펙 §4-3-12의 회원당 초안 상한이다. */
const STORY_DRAFT_LIMIT = 5;

/** 백엔드 스펙 §4-3-12의 payload 크기 상한(UTF-8 바이트)이다. */
const STORY_DRAFT_PAYLOAD_LIMIT = 65_536;

const draftImageUrl = (objectKey: string) =>
  `${STORY_DRAFT_IMAGE_BASE}/${objectKey}`;

/** 서버가 미리보기 URL로 풀어 주는 payload 안 업로드 객체 키를 모은다. */
const collectDraftImageKeys = (value: unknown, keys: string[] = []) => {
  if (
    typeof value === 'string' &&
    /^(thumbnails|characters)\/uploaded\//.test(value)
  ) {
    keys.push(value);
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectDraftImageKeys(item, keys));
  }

  return keys;
};

const draftSummary = (draft: StoredStoryDraft) => ({
  draftId: draft.draftId,
  mode: draft.mode,
  stage: draft.stage,
  title: draft.title ?? null,
  oneLineIntro: draft.oneLineIntro ?? null,
  thumbnailUrl: draft.thumbnailObjectKey
    ? draftImageUrl(draft.thumbnailObjectKey)
    : null,
  version: draft.version,
  createdAt: draft.createdAt,
  updatedAt: draft.updatedAt,
});

/** 버전 판정에서 비교하는 저장 내용이다. baseVersion은 비교하지 않는다. */
const draftContent = ({
  mode,
  stage,
  schemaVersion,
  payload,
  title,
  oneLineIntro,
  thumbnailObjectKey,
  generationRequestId,
}: PutStoryDraftRequest) =>
  JSON.stringify({
    mode,
    stage,
    schemaVersion,
    payload,
    title: title ?? null,
    oneLineIntro: oneLineIntro ?? null,
    thumbnailObjectKey: thumbnailObjectKey ?? null,
    generationRequestId: generationRequestId ?? null,
  });

const jsonError = (code: string, details?: object[]) =>
  JSON.stringify({ code, message: code, ...(details && { details }) });

/**
 * 서버 임시 저장 API(`/users/me/story-drafts`)를 메모리 저장소로 흉내 낸다. 목록, 상세, 멱등 PUT(같은 내용 재전송,
 * 버전 충돌 409, 개수 상한과 크기 상한 400), DELETE를 백엔드 스펙 §4-3-12대로 응답한다.
 *
 * @param page 대상 페이지
 * @param options.initial 미리 넣어 둘 초안
 * @param options.generations 생성 요청 ID별 스토리라인 생성 결과
 * @param options.now 저장 시각
 * @returns 저장소 핸들
 */
export async function mockStoryDrafts(
  page: Page,
  {
    initial = [],
    generations = {},
    now = () => new Date().toISOString(),
  }: {
    initial?: StoredStoryDraft[];
    generations?: Record<string, GenerateSimpleStorylinesResponse>;
    /** 저장 시각을 정한다. 페이지 시계를 고정한 스펙은 같은 시각을 넘긴다(목은 Node 시계를 쓴다). */
    now?: () => string;
  } = {},
): Promise<StoryDraftMock> {
  const mock: StoryDraftMock = {
    drafts: new Map(initial.map((draft) => [draft.draftId, { ...draft }])),
    puts: [],
    generations: new Map(Object.entries(generations)),
  };

  await page.route(STORY_DRAFTS_ROUTE, async (route) => {
    const cards = [...mock.drafts.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((draft) => ({ kind: 'DRAFT', ...draftSummary(draft) }));

    await route.fulfill({ status: 200, json: cards });
  });

  await page.route(STORY_DRAFT_ROUTE, async (route) => {
    const request = route.request();
    const draftId = new URL(request.url()).pathname.split('/').pop() ?? '';
    const current = mock.drafts.get(draftId);

    if (request.method() === 'GET') {
      if (!current) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: jsonError('NOT_FOUND'),
        });

        return;
      }

      const generationRequestId = current.generationRequestId ?? null;
      const generation =
        generationRequestId === null
          ? undefined
          : mock.generations.get(generationRequestId);

      await route.fulfill({
        status: 200,
        json: {
          ...draftSummary(current),
          schemaVersion: current.schemaVersion,
          payload: current.payload,
          generationRequestId,
          imageUrls: Object.fromEntries(
            collectDraftImageKeys(current.payload).map((key) => [
              key,
              draftImageUrl(key),
            ]),
          ),
          generation: generation
            ? {
                stage: 'STORYLINE_GENERATION',
                status: 'COMPLETED',
                result: generation,
              }
            : null,
        },
      });

      return;
    }

    if (request.method() === 'DELETE') {
      mock.drafts.delete(draftId);
      await route.fulfill({ status: 204, body: '' });

      return;
    }

    const body = request.postDataJSON() as PutStoryDraftRequest;
    const fail = (code: string, status: number, details?: object[]) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: jsonError(code, details),
      });

    mock.puts.push({ draftId, body });

    if (current && draftContent(current) === draftContent(body)) {
      await route.fulfill({ status: 200, json: draftSummary(current) });

      return;
    }

    if (
      new TextEncoder().encode(JSON.stringify(body.payload)).length >
      STORY_DRAFT_PAYLOAD_LIMIT
    ) {
      await fail('DRAFT_PAYLOAD_TOO_LARGE', 400);

      return;
    }

    if (current && body.baseVersion !== current.version) {
      await fail('DRAFT_VERSION_CONFLICT', 409, [
        { field: 'version', message: String(current.version) },
        { field: 'updatedAt', message: current.updatedAt },
      ]);

      return;
    }

    // 새 초안의 기준 버전은 null이어야 한다.
    if (!current && body.baseVersion != null) {
      await fail('BAD_REQUEST', 400);

      return;
    }

    if (!current && mock.drafts.size >= STORY_DRAFT_LIMIT) {
      await fail('DRAFT_LIMIT_EXCEEDED', 400);

      return;
    }

    const savedAt = now();
    const saved: StoredStoryDraft = {
      ...body,
      draftId,
      version: (current?.version ?? 0) + 1,
      createdAt: current?.createdAt ?? savedAt,
      updatedAt: savedAt,
    };

    mock.drafts.set(draftId, saved);
    await route.fulfill({ status: 200, json: draftSummary(saved) });
  });

  return mock;
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
  },
  {
    productId: 'credit_1000',
    baseCredits: 1_000,
    bonusCredits: 100,
    totalCredits: 1_100,
    webPriceKrw: 10_000,
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

/** 디바이스 푸시 토큰 등록·삭제(PUT/DELETE /api/v1/users/me/push-tokens) 라우트 글롭. */
const PUSH_TOKENS_ROUTE = '**/api/v1/users/me/push-tokens';

/** 알림 설정 조회·갱신(GET/PUT /api/v1/users/me/push-settings) 라우트 글롭. */
const PUSH_SETTINGS_ROUTE = '**/api/v1/users/me/push-settings';

/** E2E가 응답할 알림 설정 기본값. 서비스 켜짐, 광고·야간 꺼짐(서버 기본과 같다). */
export const PUSH_SETTINGS_FIXTURE = {
  servicePush: true,
  marketingPush: false,
  marketingNightPush: false,
} as const satisfies Required<PushSettingsResponse>;

/**
 * 푸시 토큰 등록·삭제를 204로 목킹한다.
 *
 * @param page 대상 페이지
 */
export async function mockPushTokens(page: Page): Promise<void> {
  await page.route(PUSH_TOKENS_ROUTE, async (route) => {
    await route.fulfill({ status: 204 });
  });
}

/**
 * 알림 설정 조회·갱신을 목킹한다. GET은 픽스처(덮어쓰기 가능)를, PUT은 요청 본문을 그대로
 * 돌려줘 전체 교체 계약을 재현한다. `status`를 넘기면 GET을 그 상태로 실패시킨다.
 *
 * @param page 대상 페이지
 * @param overrides 기본 픽스처 위에 덮어쓸 항목
 * @param status GET 응답 상태(기본 200)
 */
export async function mockPushSettings(
  page: Page,
  overrides: Partial<PushSettingsResponse> = {},
  status = 200,
): Promise<void> {
  await page.route(PUSH_SETTINGS_ROUTE, async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: route.request().postData() ?? '{}',
      });

      return;
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body:
        status === 200
          ? JSON.stringify({ ...PUSH_SETTINGS_FIXTURE, ...overrides })
          : '{}',
    });
  });
}

/** 홈 공개 스토리 목록(`GET /stories`) 요청. 하위 경로(`/stories/{id}` 등)와 구분하려고 경로를 정확히 비교한다. */
export const isPublicStoriesUrl = (url: URL) =>
  url.pathname === '/api/v1/stories';

/**
 * 홈 공개 스토리 목록을 한 페이지(다음 커서 없음)로 목킹한다.
 *
 * @param page 대상 페이지
 * @param items 응답할 스토리 요약 목록
 */
export async function mockPublicStories(
  page: Page,
  items: unknown[],
): Promise<void> {
  await page.route(isPublicStoriesUrl, async (route) => {
    await route.fulfill({ json: { items, nextCursor: null } });
  });
}

/**
 * 가입 동의 대기 BFF(`/api/auth/signup-consent`)를 목킹한다. 요약이 없으면 대기가 없는
 * 404를 응답하고, 취소(DELETE)는 대기를 지운 뒤 204를 응답한다.
 *
 * @param page 대상 페이지
 * @param summary 대기 중인 가입 동의 요약(없으면 null)
 * @returns 조회·취소 요청 수와, 소셜 인증이 대기를 남기는 시점을 재현할 설정 함수
 */
export async function mockSignupConsent(
  page: Page,
  summary: SignupConsentSummary | null,
): Promise<{
  get: number;
  delete: number;
  setPending: (next: SignupConsentSummary | null) => void;
}> {
  let pending = summary;
  const requests = {
    get: 0,
    delete: 0,
    setPending: (next: SignupConsentSummary | null) => {
      pending = next;
    },
  };

  await page.route(`**${SIGNUP_CONSENT_ENDPOINT}`, async (route) => {
    if (route.request().method() === 'DELETE') {
      requests.delete += 1;
      pending = null;
      await route.fulfill({ status: 204 });

      return;
    }

    requests.get += 1;
    await route.fulfill(pending ? { json: pending } : { status: 404 });
  });

  return requests;
}

/** 제공 화풍 조회 기본 응답이다. 서버처럼 `NONE`을 맨 앞에 둔다. */
export const ART_STYLE_CATALOG_FIXTURE = [
  {
    code: 'NONE',
    name: '없음',
    description: '인물 이미지를 만들지 않아요',
    previewImageUrl: null,
  },
  {
    code: 'ANIME',
    name: '애니메이션',
    description: '깔끔한 선과 선명한 색의 일본 애니메이션 그림체',
    previewImageUrl: null,
  },
  {
    code: 'WEBTOON',
    name: '웹툰',
    description: '평면 채색의 한국 로맨스 웹툰 그림체',
    previewImageUrl: null,
  },
] satisfies ArtStyleCatalogItem[];

/**
 * 제공 화풍 조회(`GET /stories/art-styles`)를 목킹한다.
 *
 * @param page 대상 페이지
 * @param catalog 응답할 제공 화풍 목록
 */
export async function mockArtStyleCatalog(
  page: Page,
  catalog: ArtStyleCatalogItem[] = ART_STYLE_CATALOG_FIXTURE,
): Promise<void> {
  await page.route('**/api/v1/stories/art-styles', async (route) => {
    await route.fulfill({ json: catalog });
  });
}

/** 제공 장르 조회 기본 응답이다. 대표 장르는 판타지와 로맨스다. */
export const GENRE_CATALOG_FIXTURE = {
  genres: [
    { id: 1, name: '판타지' },
    { id: 101, name: '로맨스' },
    { id: 102, name: '로맨스판타지' },
    { id: 103, name: '현대판타지' },
    { id: 104, name: 'BL' },
    { id: 105, name: '호러' },
  ],
  featuredGenres: [
    { id: 1, name: '판타지' },
    { id: 101, name: '로맨스' },
  ],
} satisfies GenreCatalogResponse;

/** 제공 장르 조회(`GET /stories/genres`) 요청. 검색어는 쿼리 문자열이라 경로만 비교한다. */
export const isGenreCatalogUrl = (url: URL) =>
  url.pathname === '/api/v1/stories/genres';

/**
 * 제공 장르 조회와 검색을 목킹한다. 검색어가 있으면 공백·대소문자를 무시한 부분 일치로 거른다.
 * 서버의 초성·별칭 해석은 흉내 내지 않는다.
 *
 * @param page 대상 페이지
 * @param catalog 응답할 제공 장르 목록
 */
export async function mockGenreCatalog(
  page: Page,
  catalog: typeof GENRE_CATALOG_FIXTURE = GENRE_CATALOG_FIXTURE,
): Promise<void> {
  const toKey = (value: string) => value.replace(/\s/g, '').toLowerCase();

  await page.route(isGenreCatalogUrl, async (route) => {
    const query = toKey(
      new URL(route.request().url()).searchParams.get('query') ?? '',
    );

    await route.fulfill({
      json: {
        genres: catalog.genres.filter(({ name }) =>
          toKey(name).includes(query),
        ),
        featuredGenres: catalog.featuredGenres,
      },
    });
  });
}
