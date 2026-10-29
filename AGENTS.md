# 기본 지침

작업 시작 시 `../knk-harness/AGENTS.md`를 읽으세요. 이후에는 작업과 관련된 문서와 스킬만 확인하세요.

## 자주 쓰는 명령어

```bash
pnpm typecheck        # 타입 검사
pnpm lint             # ESLint
pnpm test             # Vitest 단위 테스트
pnpm test:e2e         # Playwright E2E (프로덕션 빌드·3100 포트라 켜 둔 pnpm dev와 공존)
E2E_DEV=1 pnpm test:e2e  # 개발 서버로 E2E. 스펙 몇 개 반복할 때만. 켜 둔 pnpm dev는 꺼야 함(Next 16 단일 dev 제한)
pnpm api:generate     # OpenAPI → API 코드 생성 (로컬 백엔드 :8080 필요)
```

코드·설정 변경을 마친 작업 단위마다 `pnpm typecheck && pnpm lint && pnpm test`로 검증하세요. 읽기 전용 검토와 문서만 변경한 작업은 관련 내용·경로·링크를 검증합니다. 통과한 검사는 이후 변경이나 새로운 실패 근거가 없으면 반복하지 않습니다.

커밋 전 로컬 E2E는 **바꾼 범위만** 돌립니다. 전체 E2E와 WebKit, 비주얼 회귀는 `dev`와 `main` 대상 PR마다 CI가 돌리므로 로컬에서 반복하지 않고, PR CI 결과로 확인합니다.

- 특정 도메인의 화면 코드(`src/app`, `src/features`)를 변경했다면 커밋 전에 대응하는 `e2e/` 스펙과 스모크를 Mobile Chrome으로 통과시키세요. 예: `pnpm test:e2e e2e/stories e2e/smoke --project="Mobile Chrome"`
- 여러 도메인이 함께 쓰는 코드(`src/components`, 루트 레이아웃, 프로바이더, `src/lib`, `src/api`, `src/observability`)를 변경했다면 커밋 전에 전체 `pnpm test:e2e`를 통과시키세요.
- E2E 수정이나 오류 재현 시에는 커밋 전이 아니어도 필요한 스펙을 실행합니다.
- E2E를 실행하기 전에 에이전트가 띄운 `pnpm dev`는 끄고, 브라우저 화면 확인은 E2E가 끝난 뒤에 다시 띄워서 합니다. Turbopack 개발 서버 하나가 코어 7~8개를 쓰기 때문에 E2E의 프로덕션 빌드, 테스트 브라우저와 겹치면 CPU가 포화됩니다. 사용자가 직접 켜 둔 개발 서버는 건드리지 않습니다.

## API 레이어 (Orval)

- `src/api/generated/` 아래 파일은 **절대 직접 수정하지 않습니다.** 백엔드 스펙 변경 시 `pnpm api:generate`로 재생성합니다.
- API 호출은 생성된 TanStack Query 훅(`src/api/generated/endpoints/`)을 사용합니다. fetch를 직접 작성하지 마세요.
- 응답은 `{ data, status, headers }` 형태입니다. 사용 전 status를 확인하세요:
  ```ts
  const story = data?.status === 200 ? data.data : undefined;
  ```
- 브라우저는 백엔드를 직접 호출하지 않고 프록시 라우트(`src/app/api/[...path]/route.ts`)를 거칩니다. `API_BASE_URL`은 서버 전용 환경 변수이며 클라이언트에 노출하면 안 됩니다.
- 공통 요청 로직(타임아웃, 에러 캡처, 분석 헤더)은 `src/api/mutator/custom-instance.ts`와 `src/lib/custom-fetch.ts`에 있습니다.
- 서버에서 백엔드를 직접 호출해야 할 때는 `API_BASE_URL` 절대 URL로 `fetch` 하되, 경로를 하드코딩하지 말고 생성된 `get*Url()` 빌더를 사용합니다. 생성된 호출 훅/함수는 브라우저 `/api` 프록시를 전제로 하므로 사용하지 않습니다. 구현 예시는 `src/lib/auth/backend-client.ts`를 참고하세요.

## 관측성 (Amplitude / Sentry)

- `@amplitude/unified`, `@sentry/nextjs`를 **직접 import 하지 마세요.** 항상 래퍼를 사용합니다:
  - 분석: `@/observability/analytics`의 `track`, `useImpression`, `useTrackOnView`, `SCREEN`
  - 모니터링: `@/observability/monitoring/sentry`의 `captureApiError`, `recordAnalyticsBreadcrumb` 등
- 새 분석 이벤트는 `src/observability/analytics/events.ts`의 `AnalyticsEventProps`에 이벤트 이름과 프로퍼티 타입을 먼저 정의해야 합니다 (`track`이 타입으로 강제).
- `track`은 클라이언트 전용입니다. 서버 컴포넌트에서 호출하지 마세요.

## 디렉터리·코드 컨벤션

- 도메인 로직은 `src/features/{도메인}/{라우트}/components|hooks|utils` 구조를 따릅니다. `src/app`의 페이지는 feature 컴포넌트를 감싸는 얇은 서버 컴포넌트로 유지합니다.
- 도메인 폴더의 직속 자식은 "유닛"(라우트 폴더 또는 `_shared`)만 둡니다. `components`/`hooks`/`utils`/`lib` 같은 카테고리 폴더가 라우트 폴더와 같은 층에 뒤섞이지 않게 하세요.
  - 여러 라우트가 함께 쓰는 공용 코드는 `{도메인}/_shared/{components|hooks|utils}`에 둡니다.
  - 다른 도메인에서 import되는 코드는 소유 도메인의 `_shared`에 둡니다. 타 도메인의 라우트 유닛 내부를 직접 import 하지 마세요.
  - 도메인 폴더명은 실제 라우트 세그먼트와 맞춥니다. 도메인 인덱스 페이지도 의미에 맞는 유닛으로 둡니다(예: `stories/list`, `more/menu`).
  - 라우트가 하나뿐이거나 모든 라우트가 코드를 전부 공유하는 단일 기능 도메인은 `components`/`hooks`/`utils`를 도메인 직속에 두어도 됩니다.
- 주석(JSDoc·인라인)은 '~(이)다' 평서형으로 작성합니다 (예: "…를 반환한다."). 존댓말(~합니다)과 명사형 종결 단편(~보정. / ~무시.)은 쓰지 않되, 첫 줄 명사구 요약(예: "…를 관리하는 훅.")은 허용합니다. `src/api/generated/`는 재생성 대상이므로 예외입니다.
- 배럴 파일(`index.ts`)을 만들지 않습니다(`src/observability`는 예외). 구체 경로로 직접 import 하세요.
- 파일명은 kebab-case, named export가 기본입니다. default export는 App Router 규약 파일(page, layout 등)에만 사용합니다.
- import는 `@/` 별칭(→ `src/`)을 사용합니다. 타입 import는 inline `type` 키워드를 사용합니다.
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

앱은 단일 프레임(루트 `src/app/layout.tsx`의 `h-dvh overflow-hidden max-w-md` 컨테이너) 안에서 화면별 flex 컬럼(헤더 / 스크롤 영역 / 푸터)으로 구성됩니다.

- 뷰포트 높이(`h-dvh`)는 루트 앱 프레임만 소유합니다. 화면 셸은 `h-full`로 부모 높이를 따르고, 뷰포트 높이를 재선언하지 마세요. (예외: 루트 레이아웃을 대체하는 `global-error.tsx`)
- 스크롤 컨테이너(`overflow-y-auto`)에는 `overscroll-contain`을 함께 붙이세요. 없으면 스크롤 끝에서 문서로 체이닝돼 macOS/iOS에서 앱 프레임 전체가 러버밴드로 밀립니다.
- 앱 프레임 내부 UI에 `position: fixed`를 쓰지 마세요(조상에 transform이 생기면 기준이 조용히 깨집니다). 하단 네비·푸터는 flex 컬럼의 in-flow 요소로 두고, 스크롤을 따라가지 않는 오버레이(FAB 등)는 `(main)/layout.tsx`의 positioned 스크롤 래퍼에 `absolute`로 붙입니다. `fixed`는 body로 포털되는 다이얼로그·드로어 전용입니다.
- 헤더·네비 높이를 다른 요소의 패딩/오프셋 매직 넘버로 보정하지 마세요. 공간 분배는 flex 레이아웃에 맡깁니다.
- `sticky`는 스크롤 컨테이너 안에 있을 때만 동작합니다. 스크롤러의 형제인 헤더에는 붙이지 마세요.
- 콘텐츠 스크롤 영역의 하단 페이드는 `scroll-fade-b`(shadcn 유틸)로 통일합니다. 기본 높이(최대 56px)와 스크림 곡선은 `src/app/globals.css`에서 덮어쓰므로, 자리마다 높이만 `scroll-fade-b-*`로 바꾸고 마스크를 따로 만들지 마세요.

## 테스트

- 단위 테스트: `tests/` 아래에 소스 구조를 미러링해 배치하고 `*.test.ts`로 명명합니다 (예: `tests/features/chats/room/utils/parse-sse-stream.test.ts`). Vitest node 환경이므로 DOM 없는 순수 로직 위주로 작성합니다.
- E2E 테스트: `e2e/` 아래 `*.spec.ts`. 브라우저별 실행 대상은 `playwright.config.ts`를 참고하세요. Playwright 기본 `test` 대신 `e2e/fixtures/test.ts`의 확장 fixture를 import 하세요(API 목킹 자동 적용). 온보딩 스킵 등 헬퍼는 `e2e/fixtures/storage.ts`에 있습니다.
- 비주얼 회귀 테스트: `e2e/visual/` 아래 `*-visual.spec.ts`. 화면의 **안정된 정적 상태만** `toHaveScreenshot()`으로 비교하고, 동작·요청 계약은 일반 E2E로 검증합니다. 시간 의존 값은 `page.clock.setFixedTime()`으로 고정하세요. **로컬 기본 `pnpm test:e2e`는 비주얼 스펙을 제외하므로 비주얼 검증을 하지 않습니다.** UI를 의도적으로 바꾼 PR은 `pnpm test:e2e:visual:update`(Docker 필요)로 Linux 기준 이미지를 함께 갱신하세요.

## 하네스 문서 동기화

[도메인 목록](../knk-harness/docs/domain/AGENTS.md)에서 관련 도메인을 선택하고 `CLIENT/` 공통 문서와 `CLIENT/WEB/` 문서를 단계마다 함께 확인합니다. 앱 셸은 [공용 클라이언트](../knk-harness/docs/domain/APP/CLIENT/AGENTS.md)와 [APP WEB](../knk-harness/docs/domain/APP/CLIENT/WEB/AGENTS.md), 브라우저 기술 규칙은 [WEB 기반](../knk-harness/docs/platform/WEB/AGENTS.md)을 따릅니다.

동작 변경은 코드와 하네스 문서를 같은 작업 단위에서 갱신합니다. 브랜치와 PR을 만들 때 두 저장소에 같은 Jira 키를 사용합니다. 이 규칙만으로 작업 범위를 PR 생성까지 넓히지 않습니다. Jira 키가 없으면 필요한 단계에서 확인하며 키 없이 가능한 조사와 검토는 진행합니다.

아래 경로는 해당 도메인의 `CLIENT/` 기준입니다. 앱 기능은 `docs/domain/APP/CLIENT/`, 공통 기술 규칙은 `docs/platform/WEB/`에서 같은 역할의 문서를 찾습니다.

| 바꾼 것 | 갱신할 문서 |
| --- | --- |
| 사용자 목표와 성공 조건 | `2-1-USER-STORY.md`, `2-2-REQUIREMENTS.md` |
| 화면, 문구, 이동과 상호작용 | 공통과 WEB의 `3-1`, `3-2`, `3-3` 문서 |
| API 사용, 상태와 실행 순서 | 공통과 WEB의 `4-1`, `4-2`, `4-3`, `4-4` 문서 |
| 검증 케이스와 E2E 대응 | `WEB/5-1-VERIFICATION.md` |
| 중요한 선택의 이유 | 공통 또는 `WEB/DECISIONS.md` |
| 분석 이벤트, 프로퍼티와 수집 제한 | 하네스 `docs/reference/ANALYTICS.md` |
| 배포와 환경 설정 | 공용 WEB의 `6-DEPLOYMENT.md`, 하네스 `docs/operations/DEPLOYMENT.md` |
| 용어 | 하네스 `docs/reference/GLOSSARY.md` |

- 관련 절을 전체로 읽고 검색은 보조로 사용합니다. 화면 동작과 E2E가 바뀌면 대응 QA 케이스와 자동화 컬럼을 함께 갱신합니다.
- 일정, 진행과 미결 사항은 Jira, 적용과 검증 결과는 이 저장소의 `docs/superpowers/plans/`와 PR에 남깁니다. 현재 명세에 Phase, Jira와 작업 순서를 넣지 않습니다.
- 코드와 계약이 다르면 차이를 기록하고 승인 없이 계약을 코드에 맞추지 않습니다. 확정된 결정은 덮어쓰지 않고 후속 기록에 대체 ID와 범위를 남깁니다.
- 도메인의 `BACKEND/`, `AI/`, `CLIENT/ANDROID/`와 백엔드 및 AI 플랫폼 기반과 결정 기록은 다른 팀원 소유입니다. 웹 변경이 해당 계약에 걸리면 임의로 고치지 않고 사용자에게 알립니다.

- 문서에 걸린 절 참조(`§3-1-3` 등)를 새로 쓸 때는 실제로 존재하는 절인지 확인합니다. 없는 절을 가리키면 링크가 조용히 깨집니다.
- **사용자에게 보이는 문구(카피)를 바꾸면 상수 정의·E2E 단언·문서 리터럴을 함께 확인하세요.** 실제 렌더 값은 코드 상수(예: `src/constants/site.ts`)에서 관리합니다. 승인된 사용자 문구 계약과 다르면 함께 정정하며 코드 상수의 변경만으로 제품 계약 승인을 대신하지 않습니다. 스펙은 계약 문구를 소유하고 구현 상수 위치는 design에서 연결하며, QA 케이스는 문자열 대신 스펙 절을 참조합니다.
- **E2E에서 사용자 문구를 단언할 때는 리터럴 대신 상수를 import 하세요** (`e2e/`에서도 `@/` 별칭이 동작합니다).
- 스펙 문서 갱신 대상이 없다고 판단했다면 그 사실을 작업 보고에 함께 적어, 확인을 건너뛴 것과 구분되게 하세요.
