# 초대 코드 공유·입력 흐름 설계

- 날짜: 2026-07-12
- 티켓: KNK-566
- 브랜치: `fix/KNK-566-invite-event-method-ui-and-api`
- 환경: Next.js 16.2.6, React 19.2.4, TanStack Query 5.100.10,
  NextAuth 5.0.0-beta.31, Tailwind CSS 4, Vitest 3.2.6, Playwright 1.61.1

## 목표

초대 링크 어트리뷰션을 폐기하고 회원이 초대 코드를 직접 공유·입력하는 흐름으로
전환합니다. `/my/invite`에서 코드를 복사·공유·입력할 수 있고, 신규 가입자는 첫 로그인
직후 `AlertDialog`에서 코드를 입력하거나 건너뛸 수 있어야 합니다.

## 정본과 확정 정책

제품 계약은 `knk-harness/docs/product-specs/4-backend.md`의 크레딧 계약과
`3-frontend.md`의 FE-SCREEN-008을 따릅니다. 대화에서 확정한 항목은 문서의 모호한
표현보다 우선합니다.

- 다른 회원의 초대 코드는 계정당 평생 한 번 입력할 수 있습니다. 가입 시점과 무관해
  기존 회원도 입력할 수 있고, 건너뛴 신규 회원도 나중에 `/my/invite`에서 입력할 수
  있습니다.
- 성공 시 코드 입력자는 500 크레딧을 받습니다. 초대자도 500 크레딧을 받지만, 다른
  사람이 내 코드를 사용해 내가 받는 초대자 보상은 KST 월 10회가 상한입니다.
- 초대자가 월 상한에 도달해도 코드 입력자는 500 크레딧을 받고 요청은 200으로
  성공합니다. 생성 모델 `InviteRedeemResponse.amount`의 “제출자가 월 상한이면 0”
  설명은 확정 정책과 어긋나므로 프론트엔드 동작 기준으로 사용하지 않습니다.
- 입력값은 앞뒤 공백을 제거하고 대문자로 변환한 뒤 제출합니다. 자기 코드, 없는 코드,
  이미 입력한 계정은 서로 다른 안내를 제공합니다.
- 신규 가입 초대 입력은 별도 페이지가 아니라 `AlertDialog`로 표시합니다.
- 카카오톡 공유 본문은 “로그인하고 코드를 입력하면 나와 친구 모두 500 크레딧을
  받아요.”, 버튼은 “마냑 하러가기”를 정확히 사용합니다.
- `/invite/[code]`, 초대 코드 쿠키, 24시간 어트리뷰션, 로그인 요청의 `inviteCode`,
  `inviteUrl`은 호환 경로 없이 삭제합니다.

## 범위

### 포함

- `/my/invite`의 코드 복사, 카카오톡 코드 공유, 월 보상 진행 표시
- `/my/invite`의 상시 초대 코드 입력 폼과 보상 결과 피드백
- 로그인 응답의 `newUser`를 NextAuth 세션까지 전달하는 신규 가입 판정
- 신규 가입자의 초대 코드 `AlertDialog`
- 구 링크 라우트·쿠키·로그인 전달 경로와 관련 테스트 삭제
- 초대 입력·온보딩 분석 이벤트 추가
- 순수 로직 단위 테스트와 초대 흐름 E2E 갱신
- 월 상한을 초대자 기준으로 명확히 하는 하네스 문서 정합성 수정

### 제외

- 카카오톡·인스타그램·쓰레드 인앱 브라우저 감지와 외부 브라우저 탈출
- 백엔드 로직과 OpenAPI 생성 파일의 수동 수정
- 이미 초대 코드를 입력한 회원에게 폼을 미리 숨기는 기능

마지막 항목은 `GET /users/me/invite`에 입력 완료 여부가 없기 때문에 제외합니다. 폼은
항상 표시하고 서버의 409 `INVITE_ALREADY_REDEEMED`로 안내합니다.

## 검토한 접근 방식

### 접근 A — 공유 입력 컴포넌트와 도메인 훅 재사용(채택)

페이지와 신규 가입 다이얼로그가 같은 입력 컴포넌트와 mutation 훅을 사용합니다.
호출부는 분석용 `source`와 성공 콜백만 전달합니다. 정규화, API 호출, 오류 매핑,
토스트, 잔액 갱신이 한곳에 있어 두 화면의 동작이 어긋나지 않습니다.

### 접근 B — 신규 가입자를 `/my/invite`로 이동

구현량은 적지만 사용자가 별도 페이지보다 다이얼로그를 확정했고, 첫 로그인 흐름을
강제로 이탈시킵니다. 건너뛰기와 원래 목적지 복귀도 추가로 관리해야 하므로 채택하지
않습니다.

### 접근 C — 페이지와 다이얼로그에 폼 로직을 각각 구현

레이아웃 자유도는 높지만 오류 문구와 분석 이벤트가 두 벌로 나뉩니다. 같은 API 계약을
중복 구현할 이유가 없어 채택하지 않습니다.

## 아키텍처

### 초대 코드 도메인 로직

`src/features/my/invite/`에 다음 책임을 둡니다.

- `utils/invite-code.ts`: 입력 정규화와 API 오류를 사용자 문구·분석 사유로 변환하는
  순수 함수
- `hooks/use-redeem-invite-code.ts`: 생성된 `useRedeemInviteCode`를 감싸 제출·성공·실패
  분석, 토스트, `GET /auth/me` 캐시 무효화를 담당
- `components/invite-code-form.tsx`: 입력 상태와 접근 가능한 폼 UI를 담당
- `components/invite-screen.tsx`: 내 코드 조회, 코드 복사, 월 진행, 카카오 공유, 이용 안내
- `components/invite-onboarding-dialog.tsx`: 신규 가입자 전용 `AlertDialog`, 건너뛰기,
  입력 성공 후 닫기를 담당

생성된 API 훅과 모델은 직접 수정하지 않습니다.

### 인증 데이터 흐름

1. BFF가 Google 로그인 응답 `TokenResponse.newUser`를 받습니다.
2. `establishBackendSession`이 `isNewUser: tokens.newUser === true`를 프로필과 함께
   반환합니다.
3. 최초 OAuth JWT 콜백이 `inviteOnboardingPending`에 신규 가입 여부를 저장하고,
   NextAuth `Session`이 같은 플래그를 브라우저에 전달합니다.
4. 루트 앱 영역의 `InviteOnboardingDialog`는 인증 상태이고
   `inviteOnboardingPending`이 true일 때만 열립니다.
5. 성공 또는 “나중에 입력하기”를 누르면 `useSession().update()`로 pending 플래그를
   false로만 변경합니다. 건너뛰어도 서버 자격은 소진하지 않습니다.

JWT update 콜백은 클라이언트가 true를 주입하지 못하도록 false 전환만 허용합니다.
백엔드는 첫 로그인 뒤 `newUser: false`를 반환하므로 다음 로그인에서도 다이얼로그
대상이 아닙니다. 별도 `localStorage` 수명 관리가 필요하지 않습니다.

기존 방문자 온보딩 다이얼로그는 비회원에게만 열어 두 다이얼로그가 겹치거나 연달아
표시되지 않게 합니다.

### 코드 입력 데이터 흐름

1. 입력할 때 영문을 대문자로 바꾸고, 제출할 때 `trim().toUpperCase()`로 다시
   정규화합니다.
2. 빈 값은 API를 호출하지 않고 “코드를 입력해 주세요”를 표시합니다.
3. 제출 직전에 `client_invite_codeInput_submitted`를 기록합니다.
4. `POST /users/me/invite/redeem`이 200이면 고정 정책 문구 “크레딧 500개를
   받았어요”를 표시하고 `getMeQueryKey()`를 무효화해 잔액을 갱신합니다.
5. 성공 분석 이벤트를 기록하고, 다이얼로그 호출부는 NextAuth pending 플래그를 지운 뒤
   닫습니다.
6. 실패하면 아래 표에 따라 인라인 오류와 분석 이벤트를 기록합니다.

| 응답 | 사용자 문구 | `error_type` |
| --- | --- | --- |
| 빈 값 | 코드를 입력해 주세요 | 이벤트 없음(API 미호출) |
| 400·404 | 코드를 다시 확인해 주세요 | `not_found` |
| 409 `INVITE_SELF_CODE` | 내 코드는 입력할 수 없어요 | `self_code` |
| 409 `INVITE_ALREADY_REDEEMED` | 이미 초대 코드를 입력했어요 | `already_redeemed` |
| 401·403·5xx·네트워크·알 수 없는 409 | 초대 코드 입력에 실패했어요. 잠시 후 다시 시도해 주세요 | `network` |

OpenAPI는 오류 바디를 `void`로 생성하지만 런타임 `FetchError.data`에는 JSON 오류 바디가
보존됩니다. 기존 `getApiErrorCode`를 사용해 409의 앱 코드를 구분하고 생성 타입은
수정하지 않습니다.

## 화면 설계

### `/my/invite`

모바일 단일 컬럼을 유지합니다. 시각적 중심은 초대 코드를 큰 자간의 일련번호처럼
보여주는 코드 패널입니다. 별도 색상이나 장식 대신 기존 시맨틱 토큰과 타이포그래피를
사용해 마냑 UI와 일관성을 유지합니다.

구성 순서는 다음과 같습니다.

1. 제목 “친구를 초대하고 함께 크레딧을 받아보세요”와 코드 입력 방식 설명
2. 내 초대 코드 패널과 “이번 달 N/10회” 진행 문구
3. “코드 복사하기”, “카카오톡 공유하기” 버튼
4. “받은 초대 코드가 있나요?” 입력 폼과 “500 크레딧 받기” 버튼
5. 링크·24시간 조건을 제거한 이용 안내

월 진행은 서버가 제공한 `monthlyRewardCount`와 `monthlyRewardLimit`이 모두 있을 때만
표시합니다. 상한값을 10으로 하드코딩하지 않습니다. 복사는 렌더 시 조회한 코드 값을
클릭 이벤트 안에서 즉시 `navigator.clipboard.writeText`에 전달해 iOS Safari의 사용자
제스처 제약을 지킵니다.

내 코드 조회가 실패하거나 200 응답에 `inviteCode`가 없으면 코드 패널에 “초대 코드를
불러오지 못했어요”와 재시도 버튼을 표시합니다. 받은 코드 입력 폼은 조회 결과와
독립적으로 계속 사용할 수 있습니다.
`client_invite_viewed`는 인증 상태가 확인된 뒤 한 번만 기록해 게스트 리다이렉트를
페이지 조회로 집계하지 않습니다.

### 카카오톡 공유

- 제목: `초대 코드 {CODE}`
- 본문: `로그인하고 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.`
- 버튼: `마냑 하러가기`
- 콘텐츠 링크와 버튼 링크: 서비스 홈 `/`

코드는 링크가 아니라 메시지 텍스트에만 포함됩니다.

### 신규 가입 `AlertDialog`

- 제목: `초대 코드가 있나요?`
- 설명: `친구에게 받은 초대 코드를 입력하면 나와 친구 모두 500 크레딧을 받아요.`
- 입력 라벨: `친구 초대 코드`
- 기본 액션: `500 크레딧 받기`
- 보조 액션: `나중에 입력하기`

다이얼로그는 명시적인 두 액션으로만 끝냅니다. 제출 중에는 입력과 두 버튼을
비활성화해 중복 요청을 막습니다. 입력에는 `autoCapitalize="characters"`,
`autoComplete="off"`, `spellCheck={false}`를 적용하고 오류 영역은 `role="alert"`로
노출합니다. `aria-describedby`로 입력과 오류를 연결합니다. 입력과 버튼 높이는 48px로
두어 모바일 터치 영역을 확보합니다. Escape와 오버레이 클릭은 pending 플래그를
소비하지 않으며 다이얼로그를 닫지 않습니다.

## 분석 이벤트

기존 조회·복사·카카오 공유 이벤트를 유지하고 다음 타입을 추가합니다.

- `client_invite_codeInput_submitted`: `{source: 'invite_page' | 'onboarding'}`
- `client_invite_codeInput_succeeded`: 같은 `source`
- `client_invite_codeInput_failed`: `source`와
  `error_type: 'not_found' | 'self_code' | 'already_redeemed' | 'network'`
- `client_inviteOnboarding_shown`
- `client_inviteOnboarding_skipped`

다이얼로그 노출 이벤트는 실제로 열릴 때 한 번만 기록합니다.

## 구 흐름 제거

다음 항목을 한 번에 제거해 두 어트리뷰션 방식이 공존하지 않게 합니다.

- `src/app/invite/[code]/route.ts`
- `src/lib/auth/invite-cookie.ts`
- `APP_PATH.INVITE`
- `loginWithGoogleOnServer`의 `inviteCode` 인자와 요청 바디 분기
- `establishBackendSession`의 초대 쿠키 읽기·삭제
- 관련 단위 테스트와 E2E

구 URL은 리다이렉트 없이 404가 됩니다.

## 테스트 전략

### Vitest

- 정규화: 공백 제거, 대문자 변환, 빈 값
- 오류 매핑: 400, 404, 두 409 앱 코드, 알 수 없는 오류
- 신규 가입 전달: `TokenResponse.newUser`가 `establishBackendSession.isNewUser`로 변환
- NextAuth pending 플래그는 최초 로그인에서 설정되고 session update로 false만 허용
- 구 로그인 요청: `{idToken}`만 전송

### Playwright

- 회원이 초대 코드와 월 진행을 보고 코드를 복사
- 내 코드 조회가 실패해도 재시도 UI와 받은 코드 입력 폼이 유지됨
- 카카오 공유 설정에 코드, 확정 본문, 홈 링크, 확정 버튼이 포함됨
- 소문자·공백 코드가 정규화되어 redeem 요청으로 전송되고 성공 토스트가 표시됨
- 404와 두 409가 각각 확정 문구로 표시됨
- 신규 회원에게 `AlertDialog`가 표시되고 건너뛰면 새로고침 후 재노출되지 않음
- 신규 회원이 다이얼로그에서 코드를 입력하면 성공 후 닫힘
- `/invite/[code]` 구 진입 시 더 이상 쿠키·로그인 리다이렉트가 없음

### 전체 검증

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright test e2e/my/invite.spec.ts
```

## 알려진 계약 간극

- 생성된 redeem 오류 타입은 `ErrorType<void>`라 오류 바디 스키마가 반영되지 않았습니다.
- 로그인 endpoint 설명은 `isNewUser`라고 쓰지만 생성 모델 필드는 `newUser`입니다.
- 성공 응답 필드가 모두 optional입니다.
- 생성된 `InviteRedeemResponse.amount` 설명은 사용자 확정 월 상한 정책과 충돌합니다.
- 400을 `not_found`, 401·403·5xx를 `network`로 기록하는 것은 현재 분석 enum 안에서
  택한 구현 분류이며 상류 분석 스펙의 용어 정렬이 남아 있습니다.
- 백엔드가 `newUser: true`로 계정을 만든 뒤 BFF의 사용자 조회나 쿠키 기록이 실패하면
  다음 로그인에서 `newUser: false`가 되어 온보딩을 놓칠 수 있습니다. 웹만으로 복구할
  신호가 없어 백엔드 신규 가입 판정의 재전달 정책이 필요합니다.

프론트엔드는 런타임 오류 가드와 optional 방어를 적용합니다. 생성 파일은 직접 수정하지
않으며, 백엔드 OpenAPI 정렬은 별도 서버 작업으로 남깁니다.
