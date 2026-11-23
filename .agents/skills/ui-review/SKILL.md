---
name: ui-review
description: manyak-web의 화면 변경을 PR 전에 검사해 달라는 요청에 사용합니다. 예를 들어 "UI 검사해줘", "화면 확인해줘", "PR 전에 화면 점검해줘"에 적용합니다. 바뀐 화면을 목 데이터로 캡처해 직접 보고(`pnpm ui:capture`, `pnpm ui:compare`), agent-browser로 개발 서버를 실행해 살펴본 뒤 보고서를 만듭니다. diff를 읽는 코드 리뷰는 pr-review 스킬이 맡습니다. 코드는 고치지 않고 보고만 합니다.
---

# UI 검사 (manyak-web)

비주얼 회귀 테스트 대신 쓰는 PR 전 화면 검사입니다. 화면을 실행해서 보는 것만 맡고, 코드 규칙과 React 패턴 같은 diff 리뷰는 pr-review 스킬이 맡습니다. 결과는 사람이 판단할 보고서이고, 머지를 막는 관문은 PR CI의 E2E입니다.

## 원칙

- 보고만 합니다. 코드 수정은 사용자가 보고서를 보고 요청한 뒤 합니다.
- 브라우저 도구는 agent-browser입니다. 이 저장소의 화면 검사에서는 다른 브라우저 도구 지침보다 이 스킬을 따릅니다. 처음 쓰기 전에 `pnpm exec agent-browser skills get core`를 읽습니다.
- agent-browser는 devDependency로 설치돼 있으므로 `pnpm exec agent-browser`로 실행합니다. 세션 이름은 `pnpm exec agent-browser session id --scope worktree --prefix ui-review`로 받아 모든 명령에 `--session <이름>`을 붙입니다. 이름 없는 기본 세션은 다른 에이전트와 공유되므로 쓰지 않습니다.
- 캡처와 스크린샷은 `.playwright/`(gitignore)에만 남기고 커밋하지 않습니다.
- 사용자가 켜 둔 개발 서버는 건드리지 않습니다. 직접 띄운 개발 서버와 agent-browser 세션은 끝날 때 닫습니다(`pnpm exec agent-browser --session <이름> close`).

## 1. 대상 정하기

- `git diff --name-only origin/dev...HEAD`와 `git status --short`로 바뀐 파일을 모읍니다. `src/app`의 라우트와 `src/features/{도메인}/{라우트}`를 화면 단위로 묶습니다.
- 여러 화면이 함께 쓰는 코드(`src/components`, `src/app/layout.tsx`, `src/components/providers`, `src/app/globals.css`, `src/lib`)가 바뀌었으면 핵심 화면도 넣습니다: 홈, 스토리 상세, 채팅방, 제작 탭, 마이.
- 대상 화면이 `e2e/ui-capture/` 스펙에 없으면 3번 직접 확인으로 보고, 캡처 스펙에 추가할 상태를 보고서에 제안합니다.

## 2. 목 데이터 화면 캡처

캡처 스펙은 E2E fixture(`e2e/fixtures/auth.ts`, `api-mock.ts`)로 회원 상태와 API 응답을 고정해, 로그인 없이 회원 전용 화면까지 같은 데이터로 찍습니다.

- `pnpm ui:capture`는 프로덕션 빌드 뒤 Pixel 5(뷰포트 393x727) 화면을 `.playwright/capture/<스펙 파일>/<이름>.png`로 남기고 기존 캡처를 덮어씁니다. 빌드 때문에 몇 분 걸립니다. 스펙을 골라 찍으려면 경로를 붙입니다: `pnpm ui:capture e2e/ui-capture/stories-capture.spec.ts`
- 개발 서버를 직접 띄울 계획이면 캡처를 먼저 끝냅니다. 프로덕션 빌드와 개발 서버가 겹치면 CPU가 포화됩니다.
- 변경 전과 비교는 사용자가 요청했을 때만 합니다. 이 저장소는 worktree 없이 하나의 체크아웃을 쓰므로, 비교 중 HEAD를 옮기면 같은 체크아웃을 보는 다른 리뷰와 사용자 개발 서버까지 바뀝니다. 아래 조건을 모두 만족할 때만 하고, 아니면 건너뛰었다고 보고합니다.
  - 작업 트리가 깨끗하고, 다른 리뷰나 작업이 이 체크아웃을 동시에 쓰고 있지 않음
  - 기준 커밋에 `pnpm ui:capture`와 `e2e/ui-capture`가 있음
  - 이 브랜치가 캡처 스펙의 스크린샷 이름, 준비 단계, E2E fixture 데이터를 바꾸지 않음(바꿨으면 기준과 비교 대상이 다른 상태로 찍힘). 주석이나 테스트 제목만 바꾼 것은 괜찮습니다.
  1. `git fetch origin dev`와 `git switch --detach origin/dev` 뒤 `pnpm install --frozen-lockfile`로 의존성을 맞추고 `pnpm ui:capture`로 기준을 남깁니다.
  2. `git switch -`로 돌아와 `pnpm ui:compare`를 실행합니다. 달라진 화면은 실패로 표시되고 `.playwright/results/`에 `-expected`, `-actual`, `-diff` 이미지가 남습니다. 다른 픽셀 비율이 `maxDiffPixelRatio: 0.01`을 넘을 때만 실패하므로 1% 이하의 변화는 통과로 나오고, 픽셀별 색 허용치(`threshold` 기본 0.2) 안의 미세한 색 차이는 아예 세지 않습니다.
  3. 실패하든 성공하든 끝나면 `git status`로 원래 브랜치에 돌아왔는지 확인하고, 2번 전에 `pnpm install --frozen-lockfile`로 의존성을 되돌립니다.
- 대상 화면의 이미지를 Read로 직접 봅니다. 잘림, 넘침, 겹침, 정렬과 간격, 말줄임, 하단 고정 요소와 스크롤 영역의 경계, 다크 모드의 대비와 하드코딩 색상을 확인합니다.
- 핵심 화면과 캡처 파일은 아래와 같습니다. 나머지는 `grep -n -A2 toHaveScreenshot e2e/ui-capture/*.spec.ts`로 찾습니다. 이름이 템플릿 리터럴로 여러 줄에 걸친 경우가 있어 다음 줄까지 봅니다.

| 화면        | 캡처 (`.playwright/capture/<스펙>/`)                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 홈          | `stories-capture.spec.ts/story-list-home-sections.png`                                                                                          |
| 탐색        | `stories-capture.spec.ts/story-list-explore.png`                                                                                                |
| 제작 탭     | `stories-capture.spec.ts/story-list-default.png`, `story-list-default-dark.png`, `story-list-empty.png`                                         |
| 스토리 상세 | `stories-capture.spec.ts/story-detail-default.png`, `story-detail-footer.png`, `story-detail-liked.png` (각각 `-dark` 포함)                     |
| 채팅 목록   | `chats-capture.spec.ts/chat-list-default.png`, `chat-list-empty.png`                                                                            |
| 채팅방      | `chats-capture.spec.ts/chat-room-initial.png`, `chat-room-turns.png`, `chat-room-turns-dark.png`, `chat-room-ending.png`, `chat-room-error.png` |
| 마이        | `my-capture.spec.ts/my-guest.png`, `my-member.png`, `my-member-dark.png`                                                                        |
| 로그인      | `auth-capture.spec.ts/login-page.png`, `consent-sheet.png`                                                                                      |

## 3. agent-browser로 직접 살펴보기

- 이미 떠 있는 개발 서버(`http://localhost:3000`)가 있으면 그것을 쓰고, 없으면 `pnpm dev`를 백그라운드로 띄웁니다. 개발 서버는 dev 백엔드에 붙으므로 로그인 없이 볼 수 있는 화면 위주로 봅니다. 회원 전용 화면은 2번 캡처로 확인했다고 보고합니다.
- zsh는 변수에 담은 명령을 단어로 나누지 않으므로 함수로 줄여 씁니다: `ab() { pnpm exec agent-browser --session <이름> "$@"; }`
- 아래 순서로 엽니다. `react` 명령은 열 때 켠 경우에만 동작하고, 기기 설정 뒤 다시 읽어야 첫 화면이 데스크톱 폭으로 남지 않습니다.
  1. `ab open --enable react-devtools http://localhost:3000/<경로>`
  2. `ab set device "Pixel 5"`, `ab set media light`
  3. `ab reload`
- 다크 모드는 `ab set media dark` 뒤 `ab reload`로 봅니다. 앱 안에서 테마를 바꿔 저장되면 `set media`가 듣지 않으므로, 마이의 "테마 변경"(누를 때마다 바로 바뀜)은 누르지 않습니다.
- 앱은 문서가 아니라 `main` 안에서 스크롤합니다: `ab scroll down 600 --selector main`
- 개발 서버 화면 왼쪽 아래의 Next.js Dev Tools 버튼("N")은 하단 탭 등을 가리고 스냅샷에도 잡히므로 판단에서 뺍니다.
- 확인 항목
  - 콘솔과 페이지 오류: `ab console`, `ab errors`
  - 성능: 상호작용 전에 `ab vitals`를 한 번 실행합니다. 개발 서버 수치는 참고용이므로 LCP 요소와 CLS 이상만 봅니다.
  - 접근성: `ab a11y --tags wcag2a,wcag2aa --json`. 대비 수치와 원인은 `failureSummary`에 있습니다. `ab snapshot -i`로 이름 없는 버튼과 레이블 없는 입력도 봅니다.
  - 상호작용: 바뀐 버튼, 시트, 다이얼로그를 직접 열고 닫고 `ab snapshot -i`로 다시 확인합니다. 뒤로 가기로 닫혀야 하는 것은 Drawer, Dialog, AlertDialog뿐입니다(KNK-1613). Select나 Popover에서 뒤로 가기를 누르면 페이지를 떠납니다.
  - React: `ab react renders start`, 상호작용, `ab react renders stop`. React Compiler가 건너뛴 컴포넌트까지 렌더로 세어 수치가 크게 부풀고, 가만히 있어도 Next 개발 오버레이가 축약된 이름으로 잡힙니다. 결과는 후보로만 쓰고 의심 컴포넌트는 `ab eval`이나 DOM 변화로 다시 확인합니다. 서버 컴포넌트와 스트리밍을 바꿨으면 `ab react suspense`로 경계를 봅니다.
- 증거 스크린샷은 `ab screenshot ./.playwright/review/<이름>.png`로 남깁니다. 문법이 `screenshot [selector] [path]`라서 `./` 없이 쓰면 경로가 선택자로 읽히고 임시 폴더에 저장됩니다. 고밀도 화면이라 1080px 넘게 저장되므로 Read 전에 `sips -Z 800 <파일>`로 줄입니다. 존재 확인이나 로딩 확인에는 스크린샷 대신 스냅샷을 씁니다.
- 첫 `open`에서 Chrome 버전이 낮다는 경고가 나오면 `pnpm exec agent-browser install`로 갱신할 수 있습니다.

## 4. 원인 위치 짚기

- 2번과 3번에서 찾은 문제마다 원인이 되는 컴포넌트와 스타일을 찾아 `파일:줄`로 적습니다. diff 전체를 규칙대로 훑는 리뷰는 하지 않습니다.
- 고칠 방법을 제안할 때 웹 플랫폼 기능(다이얼로그, 팝오버, 폼, 스크롤, 대비)이 걸리면 modern-web-guidance 스킬을, 재렌더링이 원인이면 vercel-react-best-practices 스킬을 참고합니다. React Compiler를 쓰므로 `useMemo`, `useCallback` 추가는 제안하지 않습니다.

## 5. 보고

```markdown
## UI 검사 결과

- 대상: 화면 목록, 기준 커밋, 실행한 단계(캡처, 비교, 직접 확인)
- 문제: 심각도(높음, 보통, 낮음)별로 화면, 증거(캡처 경로나 명령 출력), 원인 위치(`파일:줄`), 제안
- 확인하지 못한 것: 건너뛴 단계와 이유(회원 전용 화면을 직접 보지 못함, 비교 생략 등)
```

- 문제가 없으면 무엇을 확인했는지만 짧게 적습니다. 확인하지 않은 항목을 통과로 쓰지 않습니다.
- PR 본문 화면 절에는 대표 캡처와 확인 결과를 옮깁니다. 이미지 첨부는 create-pr 스킬의 절차를 따릅니다.
