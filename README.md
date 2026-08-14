# manyak-web

## 기술 스택

| 분류          | 사용 기술                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------- |
| 프레임워크    | Next.js 16 (App Router), React 19, [React Compiler](https://react.dev/learn/react-compiler) |
| 데이터 패칭   | TanStack Query, [Orval](https://orval.dev/) (OpenAPI 코드 생성)                             |
| UI            | shadcn/ui, Base UI, Tailwind CSS v4, motion, Sonner, next-themes                            |
| 검증/타입     | TypeScript, Zod                                                                             |
| 테스트        | Vitest                                                                                      |
| 패키지 매니저 | pnpm                                                                                        |

> ⚠️ **React Compiler를 사용하므로 `useMemo`, `useCallback`을 직접 작성하지 않습니다.** 메모이제이션은 컴파일러가 처리합니다.

## 시작하기

### 사전 요구사항

- **Node.js 20+**
- **pnpm 10.28.2** (`corepack enable`로 활성화 권장)
- **백엔드 API 서버** — `API_BASE_URL`로 지정한 서버가 실행 중이어야 합니다. 로컬 서버(`http://localhost:8080`)나 공용 개발 서버를 사용할 수 있으며, API 코드 생성(`pnpm api:generate`)도 같은 서버의 OpenAPI 스펙(`/v3/api-docs`)을 참조합니다.

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local   # API_BASE_URL 값을 채워주세요

# 개발 서버 실행
pnpm dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

| 변수           | 설명                                                                                   |
| -------------- | -------------------------------------------------------------------------------------- |
| `API_BASE_URL` | 백엔드 API 서버의 base URL (예: `http://localhost:8080`, `https://dev-api.manyak.app`) |

브라우저는 백엔드를 직접 호출하지 않고, Next.js의 프록시 라우트(`src/app/api/[...path]/route.ts`)를 거칩니다. 클라이언트가 `/api/*`로 요청하면 서버가 `API_BASE_URL`로 그대로 전달합니다. `pnpm api:generate`도 Next.js와 같은 환경 변수 로더로 이 값을 읽어 `${API_BASE_URL}/v3/api-docs`를 사용합니다. 따라서 `API_BASE_URL`은 서버 사이드와 개발 도구에서만 사용되며 클라이언트 번들에 노출되지 않습니다.

## API 코드 생성 (Orval)

이 프로젝트는 API 클라이언트를 직접 작성하지 않고, 백엔드의 OpenAPI 스펙으로부터 자동 생성합니다.

```bash
pnpm api:generate
```

위 명령은 `.env.local`의 `API_BASE_URL`을 읽고 `${API_BASE_URL}/v3/api-docs`에서 다음을 생성합니다. URL 끝의 `/`는 자동으로 제거하며, 값이 없으면 생성 전에 오류로 중단합니다.

- `src/api/generated/endpoints` — TanStack Query 훅
- `src/api/generated/models` — 타입 정의
- `src/api/generated/zod` — Zod 스키마

생성된 코드는 모든 요청을 공용 인스턴스(`src/api/mutator/custom-instance.ts`)를 통해 보냅니다.

> 백엔드 API 스펙이 변경되면 `API_BASE_URL`의 서버가 실행되고 OpenAPI 문서를 공개한 상태에서 `pnpm api:generate`를 다시 실행해 생성 코드를 갱신하세요. `src/api/generated` 아래 파일은 직접 수정하지 않습니다.

## 프로젝트 구조

```
src/
├── app/                  # App Router (라우트, 레이아웃)
│   ├── (main)/           # 메인 영역 (스토리 목록, 채팅 목록)
│   ├── (story)/          # 스토리 생성·상세
│   ├── (chat)/           # 채팅방
│   └── api/[...path]/    # 백엔드로 요청을 전달하는 프록시 라우트
├── api/                  # Orval 생성 코드(generated) 및 요청 인스턴스(mutator)
├── features/             # 도메인별 기능 모듈
│   ├── stories/          # 스토리 (list, detail, new, components)
│   └── chats/            # 채팅 (list, room, components)
├── components/           # 공용 컴포넌트 (ui, common, layout, providers)
├── hooks/                # 공용 훅
├── lib/                  # 유틸리티 (fetch, query-client, 포맷 등)
├── constants/            # 상수
├── types/                # 공용 타입
└── assets/               # 정적 에셋
```

- 라우트는 도메인별 [route group](https://nextjs.org/docs/app/building-your-application/routing/route-groups)으로 분리되어 있습니다.
- 화면을 구성하는 로직과 컴포넌트는 `src/features` 아래에 도메인 단위로 모읍니다.
- 경로 별칭 `@/`는 `src/`를 가리킵니다 (예: `import { Button } from '@/components/ui/button'`).

## 주요 스크립트

| 명령                | 설명                               |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | 개발 서버 실행                     |
| `pnpm build`        | 프로덕션 빌드                      |
| `pnpm start`        | 빌드된 앱 실행                     |
| `pnpm test`         | Vitest 테스트 실행                 |
| `pnpm test:watch`   | Vitest 워치 모드                   |
| `pnpm typecheck`    | 타입 검사 (`tsc --noEmit`)         |
| `pnpm lint`         | ESLint 검사                        |
| `pnpm format`       | Prettier 포맷팅                    |
| `pnpm api:generate` | OpenAPI 스펙으로부터 API 코드 생성 |
