---
name: pr-review
description: manyak-web의 변경을 PR 전에 코드 리뷰해 달라는 요청에 사용합니다. 예를 들어 "PR 올리기 전에 리뷰해줘", "코드 리뷰해줘", "보안 점검해줘"에 적용합니다. diff를 읽어 정확성 버그, 보안과 개인정보, AGENTS.md 규칙, React와 웹 플랫폼 패턴, 테스트와 하네스 문서 동기화를 점검하고 PR 본문에 넣을 보고서를 만듭니다. 화면을 실행해 보는 검사는 ui-review 스킬이 맡습니다. 코드는 고치지 않고 보고만 합니다.
---

# PR 전 코드 리뷰 (manyak-web)

diff를 읽는 리뷰입니다. 화면을 띄워 보는 검사(캡처, agent-browser)는 ui-review 스킬이 맡고, 머지를 막는 관문은 PR CI입니다. lint와 typecheck가 잡는 형식 문제는 다시 지적하지 않습니다.

## 원칙

- 보고만 합니다. 코드 수정은 사용자가 보고서를 보고 요청한 뒤 합니다.
- 근거 없는 추측은 문제로 올리지 않습니다. 실패하는 입력이나 상태, 코드 위치(`파일:줄`)를 댈 수 있는 것만 문제로 쓰고, 확신이 낮으면 "확인 필요"로 따로 둡니다.
- 바뀐 줄과 그 줄이 영향을 주는 코드만 봅니다. 기존 코드의 문제는 이번 변경이 악화시킨 경우에만 올리고, 나머지는 "기존 문제"로 짧게 적습니다.

## 1. 범위 정하기

- PR 전 브랜치는 `git fetch origin dev` 뒤 `git diff origin/dev...HEAD`와 커밋하지 않은 변경(`git diff`, `git status --short`)을 읽습니다. 특정 커밋은 `git show <sha>`, 이미 올린 PR은 `gh pr diff <번호>`로 읽습니다. 통계나 파일 목록만 보고 판단하지 않습니다.
- 생성 코드가 diff 대부분을 차지하면 `git diff origin/dev...HEAD -- . ':!src/api/generated'`처럼 빼고 읽습니다.
- 브랜치 이름의 Jira 키로 작업 목적을 확인합니다. PR이 있으면 `gh pr view <번호> --json body`로 본문을 읽습니다. 호출한 쪽이 Jira 설명이나 슬랙 요청 같은 요청 맥락을 넘겨주면 그것을 기준으로 삼습니다.
- 요청받은 그대로 구현한 동작은 문제로 올리지 않습니다. 요청 자체에 위험이 있어 보이면 "확인 필요"에 요청 내용과 함께 적습니다.
- `src/api/generated/`의 변경은 `pnpm api:generate` 결과인지만 봅니다. 생성 코드 자체는 리뷰하지 않습니다.

## 2. 일반 리뷰

- Skill 도구에 `code-review`가 있으면 effort `medium`으로 실행합니다. 인자는 PR 전이면 `medium`(현재 diff), PR이 있으면 `medium <PR 번호>`입니다. `max`와 `ultra`는 사용자가 요청할 때만 씁니다. 영어로 돌아온 지적은 한국어로 옮기고 아래 점검과 겹치면 하나로 합칩니다. 없으면 정확성 항목을 직접 봅니다.
- 내장 `security-review`는 부르지 않습니다. 인자 없이 현재 브랜치 전체 diff를 대상으로 삼고 하위 에이전트를 띄우는 절차라 범위와 도구가 맞지 않습니다. 보안은 3번을 직접 봅니다. 사용자가 원하면 메인 세션에서 `/security-review`를 따로 실행할 수 있다고 보고서에 적습니다.
- 정확성: 조건 분기와 경계값, 비동기 순서와 경쟁 상태, effect 정리, 실패와 빈 응답 처리, 로딩과 오류 상태 누락
- 이 앱에서 자주 틀리는 곳
  - 생성 훅 응답은 `data?.status === 200` 확인 뒤 사용합니다.
  - 회원과 게스트가 같은 화면을 쓰면 세션 분기와 회원 쿼리 무효화가 함께 바뀌었는지 봅니다.
  - 목록을 바꾸는 요청 뒤에는 관련 쿼리 무효화나 캐시 갱신이 있는지 봅니다.

## 3. 보안과 개인정보

- 서버 전용 값(`API_BASE_URL`, `AUTH_*` 비밀값)이 클라이언트 코드나 `NEXT_PUBLIC_` 변수로 새지 않는지
- BFF 프록시(`src/app/api/[...path]/route.ts`)와 `src/lib/auth/`: 토큰과 헤더를 필요한 것만 전달하는지, 인증 실패와 갱신 처리
- 로그인 뒤 돌아갈 주소(`src/features/auth/_shared/utils/login-callback-url.ts` 등)가 외부 주소로 열리지 않는지
- AI 응답과 사용자 입력 렌더링: `dangerouslySetInnerHTML`, HTML로 해석되는 마크다운, 링크 `href`의 `javascript:` 처리
- 분석과 모니터링: `track`, Sentry로 사용자 입력 원문이나 개인정보를 보내지 않는지. 기준은 하네스 `docs/reference/ANALYTICS.md`의 수집 제한입니다.
- 비밀값, 실제 키, 로컬 전용 파일이 커밋에 섞이지 않았는지

## 4. 프로젝트 규칙

AGENTS.md 규칙 중 lint로 막지 못하는 것을 봅니다.

- API: 생성 훅 대신 직접 `fetch`, 서버의 하드코딩 경로(`get*Url()` 미사용)
- 관측성: `@amplitude/unified`, `@sentry/nextjs` 직접 import, `AnalyticsEventProps`에 정의하지 않은 이벤트, 서버 컴포넌트의 `track`
- 구조: 도메인 폴더 구조(`src/features/{도메인}/{라우트}`, `_shared`), 다른 도메인 라우트 유닛 직접 import, 배럴 `index.ts`, kebab-case와 named export
- React: `useMemo`, `useCallback` 사용, effect 안의 동기 `setState`, `FormEvent`, `await` 없이 쓴 `params`
- 라우트와 문구: 하드코딩한 경로(`APP_PATH` 미사용), 상수 없이 쓴 사용자 문구, E2E에서 리터럴로 단언한 문구
- 스타일과 레이아웃: `cn()` 없는 조건부 클래스, 하드코딩 색상, `h-dvh` 재선언, 앱 프레임 안 `fixed`, `overscroll-contain` 누락, 헤더 높이 매직 넘버, 스크롤러 밖 `sticky`
- 주석: '~(이)다' 평서형

## 5. React와 웹 플랫폼

- 컴포넌트, 훅, 서버 컴포넌트, 데이터 요청 코드가 바뀌었으면 vercel-react-best-practices 스킬로 데이터 요청 순서(워터폴), 번들 크기, 서버와 클라이언트 경계, 재렌더링을 봅니다. React Compiler를 쓰므로 `useMemo`, `useCallback` 추가는 제안하지 않습니다.
- 다이얼로그, 팝오버, 폼, 스크롤, 날짜 같은 웹 플랫폼 기능을 새로 쓰거나 바꿨으면 modern-web-guidance 스킬로 더 나은 기본 기능이 있는지 봅니다.
- import 경로나 이름만 바뀌었으면 이 단계를 건너뛰고 그 사실을 적습니다.

## 6. 테스트와 하네스 문서

- 순수 로직을 바꿨으면 `tests/`에 단위 테스트가 있거나 바뀌었는지, 화면 동작을 바꿨으면 대응 `e2e/` 스펙이 바뀌었는지 봅니다.
- AGENTS.md "하네스 문서 동기화" 표 기준으로 갱신할 문서가 있는지 봅니다. 화면과 기능은 `../knk-harness/docs/spec/<도메인>/CLIENT/`(공통과 `WEB/`), 공통 기술 규칙은 `docs/platform/CLIENT/WEB/`에서 시작합니다. 갱신 대상이 없다고 판단하면 이유를 적습니다.
- 같은 Jira 키의 하네스 브랜치는 `git -C ../knk-harness branch -a --list '*KNK-<번호>*'`와 `git -C ../knk-harness worktree list`로 찾고, 있으면 그 diff와 대조합니다.
- 백엔드, AI, Android 소유 문서와 계약에 걸리는 변경은 고칠 대상이 아니라 알릴 대상으로 적습니다.

## 7. 보고

```markdown
## PR 리뷰 결과

- 대상: 기준(`origin/dev`) 또는 대상 커밋과 PR, 커밋 수, 바뀐 파일 수, 커밋하지 않은 변경 포함 여부, 실행한 단계
- 문제: 심각도별로 위치(`파일:줄`), 근거(실패하는 입력이나 상태), 제안
  - 높음: 머지 전에 고쳐야 함(버그, 보안, 개인정보, 계약 위반)
  - 보통: 이번 PR에서 고치는 게 좋음(규칙 위반, 테스트 누락, 문서 미갱신)
  - 낮음: 선택(개선 제안)
- 확인 필요: 확신이 낮거나 다른 팀 확인이 필요한 것
- 기존 문제: 이번 변경과 무관하게 발견한 것
- 확인하지 못한 것: 건너뛴 단계와 이유
```

- 문제가 없으면 무엇을 확인했는지만 짧게 적습니다. 확인하지 않은 항목을 통과로 쓰지 않습니다.
- PR 본문의 "리뷰 참고"에는 남은 문제와 확인 필요 항목만 옮깁니다.
