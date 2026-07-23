# 기본 지침

작업을 시작하기 전에 다음 하네스 레포지토리를 먼저 확인하세요.

- `../knk-harness`

## 자주 쓰는 명령어

```bash
pnpm typecheck        # 타입 검사
pnpm lint             # ESLint
pnpm test             # Vitest 단위 테스트
pnpm test:e2e         # Playwright E2E
pnpm api:generate     # OpenAPI → API 코드 생성 (로컬 백엔드 :8080 필요)
```

작업 완료 전 `pnpm typecheck && pnpm lint && pnpm test`로 검증하세요 (셋이 합쳐 6초 남짓이므로 작업 단위마다 돌립니다).

E2E는 **커밋 직전에만** 돌립니다. 화면·컴포넌트 코드(`src/app`·`src/features`·`src/components`)를 건드렸다면 커밋 전에 `pnpm test:e2e`를 반드시 통과시키세요 — `pnpm test`는 Vitest만 실행하므로 문구·구조 변경으로 깨진 E2E를 잡지 못합니다. 작업 단위마다 돌릴 필요는 없습니다. 진행 로그가 길어 답답하면 `pnpm test:e2e --reporter=dot`을 쓰세요(소요 시간은 동일).

## API 레이어 (Orval)

- `src/api/generated/` 아래 파일은 **절대 직접 수정하지 않습니다.** 백엔드 스펙 변경 시 `pnpm api:generate`로 재생성합니다.
- API 호출은 생성된 TanStack Query 훅(`src/api/generated/endpoints/`)을 사용합니다. fetch를 직접 작성하지 마세요.
- 응답은 `{ data, status, headers }` 형태입니다. 사용 전 status를 확인하세요:
  ```ts
  const story = data?.status === 200 ? data.data : undefined;
  ```
- 브라우저는 백엔드를 직접 호출하지 않고 프록시 라우트(`src/app/api/[...path]/route.ts`)를 거칩니다. `API_BASE_URL`은 서버 전용 환경 변수이며 클라이언트에 노출하면 안 됩니다.
- 공통 요청 로직(타임아웃, 에러 캡처, 분석 헤더)은 `src/api/mutator/custom-instance.ts`와 `src/lib/custom-fetch.ts`에 있습니다.
- 서버(BFF)에서 백엔드를 **직접** 호출해야 할 때(예: NextAuth 콜백처럼 프록시/세션이 성립하기 전 실행되는 서버 코드)는 생성된 훅/함수를 쓸 수 없습니다. 이들은 브라우저 → `/api` 프록시 경유가 전제이기 때문입니다(`custom-instance`가 URL을 상대경로 `/api`로 바꾸고 세션 토큰은 프록시가 주입). 이 경우 `src/lib/auth/backend-client.ts`처럼 `API_BASE_URL` 절대 URL로 직접 `fetch` 하되, **경로 문자열은 하드코딩하지 말고 생성된 URL 빌더**(`get*Url`, 예: `getLoginWithGoogleUrl()`)를 재사용하세요. 그래야 `pnpm api:generate` 재생성만으로 경로가 함께 갱신돼 백엔드 스펙과의 드리프트(누락된 `/api` 접두사 등)를 막습니다.

## 관측성 (Amplitude / Sentry)

- `@amplitude/unified`, `@sentry/nextjs`를 **직접 import 하지 마세요.** 항상 래퍼를 사용합니다:
  - 분석: `@/observability/analytics`의 `track`, `useImpression`, `useTrackOnView`, `SCREEN`
  - 모니터링: `@/observability/monitoring/sentry`의 `captureApiError`, `recordAnalyticsBreadcrumb` 등
- 새 분석 이벤트는 `src/observability/analytics/events.ts`의 `AnalyticsEventProps`에 이벤트 이름과 프로퍼티 타입을 먼저 정의해야 합니다 (`track`이 타입으로 강제).
- `track`은 클라이언트 전용입니다. 서버 컴포넌트에서 호출하지 마세요.

## 디렉터리·코드 컨벤션

- 도메인 로직은 `src/features/{도메인}/{라우트}/components|hooks|utils` 구조를 따릅니다 (예: `features/stories/detail/components/story-detail.tsx`). `src/app`의 페이지는 feature 컴포넌트를 감싸는 얇은 서버 컴포넌트로 유지합니다.
- 도메인 폴더의 직속 자식은 "유닛"(라우트 폴더 또는 `_shared`)만 둡니다. `components`/`hooks`/`utils`/`lib` 같은 카테고리 폴더가 라우트 폴더와 같은 층에 뒤섞이지 않게 하세요.
  - 여러 라우트가 함께 쓰는 공용 코드는 `{도메인}/_shared/{components|hooks|utils}`에 둡니다 (예: `features/stories/_shared/components/story-turn-count.tsx`).
  - 도메인 간에도 같은 원칙을 적용합니다. 다른 도메인에서 import되는 코드는 소유 도메인의 `_shared`에 두고, 타 도메인의 라우트 유닛 내부(`{도메인}/{라우트}/...`)를 직접 import 하지 마세요. 그래야 라우트 유닛 내부를 그 유닛 전용으로 자유롭게 리팩터링할 수 있습니다.
  - 도메인 폴더명은 실제 live 라우트 세그먼트와 맞춥니다 (예: `/more` 화면을 담는 도메인은 `features/more`). 도메인 인덱스 페이지(`/{도메인}` 자체) 코드도 의미에 맞는 이름의 유닛으로 둡니다 (예: `stories/list`, `more/menu`).
  - 라우트가 하나뿐이거나 모든 라우트가 코드를 전부 공유하는 단일 기능 도메인(예: `onboarding`, `legal`)은 `components`/`hooks`/`utils`를 도메인 직속에 평평하게 두어도 됩니다(라우트 폴더와 섞일 일이 없으므로).
- 주석(JSDoc·인라인)은 '~(이)다' 평서형으로 작성합니다 (예: "…를 반환한다."). 존댓말(~합니다)과 명사형 종결 단편(~보정. / ~무시.)은 쓰지 않되, 첫 줄 명사구 요약(예: "…를 관리하는 훅.")은 허용합니다. `src/api/generated/`는 재생성 대상이므로 예외입니다.
- 배럴 파일(`index.ts`)을 만들지 않습니다(`src/observability`는 예외). 구체 경로로 직접 import 하세요.
- 파일명은 kebab-case, named export가 기본입니다. default export는 App Router 규약 파일(page, layout 등)에만 사용합니다.
- import는 `@/` 별칭(→ `src/`)을 사용하고, 정렬은 ESLint(simple-import-sort)가 강제합니다. 타입 import는 inline `type` 키워드를 사용합니다.
- 라우트 경로 문자열을 하드코딩하지 말고 `src/constants/app-path.ts`의 `APP_PATH`를 사용하세요.
- React Compiler를 사용 중이기 때문에 `useMemo`, `useCallback`을 사용하지 마세요.
- `<form onSubmit>` 핸들러를 작성할 때는 deprecated된 `FormEvent` 대신 `SubmitEvent<HTMLFormElement>`를 사용하세요.
- 페이지의 `params`는 `Promise`입니다. `await params`로 풀어서 사용하세요.

## UI·스타일

- 모바일 웹이 기준입니다.
- `src/components/ui/`는 shadcn 기반(cva 변형 패턴), `common/`은 공용 컴포넌트, `layout/`은 앱 레이아웃, `providers/`는 루트 프로바이더입니다.
- 조건부 클래스는 반드시 `cn()`(`@/lib/utils`)으로 병합하세요.
- Tailwind CSS v4입니다. `tailwind.config` 파일이 없고 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의되어 있습니다. 색상은 하드코딩(`text-blue-500`) 대신 시맨틱 토큰(`text-primary`, `text-foreground-secondary` 등)을 사용하세요.
- 다크 모드는 next-themes의 `.dark` 클래스 방식입니다.

## 레이아웃·스크롤

앱은 단일 프레임(루트 `src/app/layout.tsx`의 `h-svh overflow-hidden max-w-md` 컨테이너) 안에서 화면별 flex 컬럼(헤더 / 스크롤 영역 / 푸터)으로 구성됩니다.

- 뷰포트 높이(`h-svh`)는 루트 앱 프레임만 소유합니다. 화면 셸은 `h-full`로 부모 높이를 따르고, `h-svh`를 재선언하지 마세요. (예외: 루트 레이아웃을 대체하는 `global-error.tsx`)
- 스크롤 컨테이너(`overflow-y-auto`)에는 `overscroll-contain`을 함께 붙이세요. 없으면 스크롤 끝에서 문서로 체이닝돼 macOS/iOS에서 앱 프레임 전체가 러버밴드로 밀립니다.
- 앱 프레임 내부 UI에 `position: fixed`를 쓰지 마세요(조상에 transform이 생기면 기준이 조용히 깨집니다). 하단 네비·푸터는 flex 컬럼의 in-flow 요소로 두고, 스크롤을 따라가지 않는 오버레이(FAB 등)는 `(main)/layout.tsx`의 positioned 스크롤 래퍼에 `absolute`로 붙입니다. `fixed`는 body로 포털되는 다이얼로그·드로어 전용입니다.
- 헤더·네비 높이를 다른 요소의 패딩/오프셋 매직 넘버로 보정하지 마세요. 공간 분배는 flex 레이아웃에 맡깁니다.
- `sticky`는 스크롤 컨테이너 안에 있을 때만 동작합니다. 스크롤러의 형제인 헤더에는 붙이지 마세요.
- 콘텐츠 스크롤 영역의 하단 페이드는 `scroll-fade-b`(shadcn 유틸)로 통일합니다.

## 테스트

- 단위 테스트: `tests/` 아래에 소스 구조를 미러링해 배치하고 `*.test.ts`로 명명합니다 (예: `tests/features/chats/room/utils/parse-sse-stream.test.ts`). Vitest node 환경이므로 DOM 없는 순수 로직 위주로 작성합니다.
- E2E 테스트: `e2e/` 아래 `*.spec.ts`. 전체 E2E는 Mobile Chrome(Pixel 5)에서 실행하고, `e2e/smoke/` 스펙은 Desktop Chrome과 Mobile Safari(iPhone 13)에서도 실행합니다. Playwright 기본 `test` 대신 `e2e/fixtures/test.ts`의 확장 fixture를 import 하세요(API 목킹 자동 적용). 온보딩 스킵 등 헬퍼는 `e2e/fixtures/storage.ts`에 있습니다.
- 비주얼 회귀 테스트: `e2e/visual/` 아래 `*-visual.spec.ts`. Mobile Chrome(Pixel 5) 프로젝트에서만 실행하며, 화면의 **안정된 정적 상태만** `toHaveScreenshot()`으로 비교합니다(동작·요청 계약 검증은 일반 E2E 담당, 스트리밍 진행 중 같은 동적 상태 금지). 상대 시간 등 시간 의존 값은 `page.clock.setFixedTime()`으로 고정하세요. 기준 이미지는 Linux 렌더링만 정본이라 로컬에서는 비교를 건너뜁니다(`ignoreSnapshots`). 비교가 없으면 플로우만 돌고 검증이 남지 않으므로 **로컬 `pnpm test:e2e`는 `e2e/visual/`을 아예 제외**하며(CI에서는 포함), 갱신·확인은 `pnpm test:e2e:visual:update`(Docker 필요)로 합니다. UI를 의도적으로 바꾼 PR은 이 명령으로 기준 이미지를 함께 갱신해야 CI가 통과합니다.
- QA 문서: 화면 동작(상태·문구·흐름)을 바꾸는 작업은 `../knk-harness/docs/qa/`의 해당 도메인 QA 문서 케이스를 함께 갱신하세요(추가·수정·삭제). E2E 스펙을 추가·변경했다면 대응 케이스의 자동화 컬럼도 갱신합니다.
