# 기본 지침

작업을 시작하기 전에 다음 문서를 먼저 확인하세요.

- `../knk-harness/CLAUDE.md`

## Next.js 프론트엔드 전용 지침

- React Compiler를 사용 중이기 때문에 `useMemo`, `useCallback`을 사용하지마세요.
- `<form onSubmit>` 핸들러를 작성할 때는 deprecated된 `FormEvent` 대신 `SubmitEvent<HTMLFormElement>`를 사용하세요.
- 페이지의 `params`는 `Promise`입니다. `await params`로 풀어서 사용하세요.
- 모바일 웹이 기준입니다. E2E도 Mobile Chrome(Pixel 5) 뷰포트로 실행됩니다.

## 자주 쓰는 명령어

```bash
pnpm typecheck        # 타입 검사
pnpm lint             # ESLint
pnpm test             # Vitest 단위 테스트
pnpm test:e2e         # Playwright E2E
pnpm api:generate     # OpenAPI → API 코드 생성 (로컬 백엔드 :8080 필요)
```

작업 완료 전 `pnpm typecheck && pnpm lint && pnpm test`로 검증하세요.

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
- 배럴 파일(`index.ts`)을 만들지 않습니다(`src/observability`는 예외). 구체 경로로 직접 import 하세요.
- 파일명은 kebab-case, named export가 기본입니다. default export는 App Router 규약 파일(page, layout 등)에만 사용합니다.
- import는 `@/` 별칭(→ `src/`)을 사용하고, 정렬은 ESLint(simple-import-sort)가 강제합니다. 타입 import는 inline `type` 키워드를 사용합니다.
- 라우트 경로 문자열을 하드코딩하지 말고 `src/constants/app-path.ts`의 `APP_PATH`를 사용하세요.

## UI·스타일

- `src/components/ui/`는 shadcn 기반(cva 변형 패턴), `common/`은 공용 컴포넌트, `layout/`은 앱 레이아웃, `providers/`는 루트 프로바이더입니다.
- 조건부 클래스는 반드시 `cn()`(`@/lib/utils`)으로 병합하세요.
- Tailwind CSS v4입니다. `tailwind.config` 파일이 없고 디자인 토큰은 `src/app/globals.css`의 `@theme`에 정의되어 있습니다. 색상은 하드코딩(`text-blue-500`) 대신 시맨틱 토큰(`text-primary`, `text-foreground-secondary` 등)을 사용하세요.
- 다크 모드는 next-themes의 `.dark` 클래스 방식입니다.

## 테스트

- 단위 테스트: `tests/` 아래에 소스 구조를 미러링해 배치하고 `*.test.ts`로 명명합니다 (예: `tests/features/chats/room/lib/parse-sse-stream.test.ts`). Vitest node 환경이므로 DOM 없는 순수 로직 위주로 작성합니다.
- E2E 테스트: `e2e/` 아래 `*.spec.ts`. Playwright 기본 `test` 대신 `e2e/fixtures/test.ts`의 확장 fixture를 import 하세요(API 목킹 자동 적용). 온보딩 스킵 등 헬퍼는 `e2e/fixtures/storage.ts`에 있습니다.
