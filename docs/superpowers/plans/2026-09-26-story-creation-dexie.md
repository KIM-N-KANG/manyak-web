# KNK-1433 스토리 제작 저장소 Dexie 전환 계획

## 범위와 현재 상태

- Jira: [KNK-1433](https://kimandkang.atlassian.net/browse/KNK-1433), 담당 강동우, 진행 중
- 웹 브랜치: `refactor/KNK-1433-story-creation-dexie`
- 하네스 브랜치: `docs/KNK-1433-story-creation-dexie`
- 분기 기준: 각각 fetch한 `origin/dev`. 웹 `82f1f1c398317b9389c6222705deb228b6d8f34a`, 하네스 `b773769ca5a3212ad3ac4769806ba0c678c00c7b`
- 후속 구현 진행 요청에 따라 아래 계획을 구현했습니다. 현재 계약과 구조는 연결된 하네스 문서가 정본이며, 이 파일은 작업 범위와 검증 근거를 보관합니다.

편집 초안, 스토리라인 생성 진행 기록, 완성 요청만 Dexie로 옮깁니다. 기존 requestId, 요청 본문, 최초 저장 시각, 다중 제작, 재개 경로와 서버 복구 계약을 보존합니다. 게스트 서재 ID, 테마와 작은 설정, 결제 대기 주문, sessionStorage의 탭별 재개 및 로그인 표시는 유지합니다. 서버 동기화, Dexie Cloud, 백엔드와 Android 수정은 포함하지 않습니다. maxWait는 추가하지 않습니다. 저장 및 조회 실패 문구는 제출 차단과 재시도 계약에 맞춰 함께 반영했습니다.

## 착수 시 확인한 구조

| 지점                                                                                                                                                                         | 착수 시 방식                                                                                                         | 전환 내용                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [제작 저장소](../../../src/features/stories/_shared/utils/creation-request-storage.ts)                                                                                       | 초안과 완성 요청을 localStorage JSON 배열로 저장하고 한 건 변경에도 전체 목록을 다시 씁니다.                         | requestId별 레코드 읽기와 쓰기, 상태 검사와 변경을 같은 트랜잭션에 둡니다. |
| [제작 퍼널](../../../src/features/stories/new/hooks/use-story-create-funnel.ts)                                                                                              | 소유 requestId가 바뀌면 기존 레코드를 먼저 지운 뒤 새 레코드를 씁니다. 완성 요청 추가와 초안 삭제도 따로 실행합니다. | 이전 초안 보존, 최초 시각 전달, 새 기록 삽입을 원자적으로 처리합니다.      |
| [자동 저장](../../../src/features/stories/new/utils/draft-autosave.ts)                                                                                                       | 300ms 뒤 동기식 boolean 저장 결과를 받습니다.                                                                        | Promise 완료 기준의 상태 표시와 최신 입력 순서를 보장합니다.               |
| [초안 재개](../../../src/features/stories/new/hooks/use-story-create-draft.ts)                                                                                               | useState 초기화에서 저장소를 바로 읽습니다.                                                                          | 이관과 조회가 끝난 뒤 한 번 복원합니다.                                    |
| [제작 목록 구독](../../../src/features/studio/menu/hooks/use-pending-creation-request.ts)                                                                                    | useSyncExternalStore와 커스텀 이벤트로 두 JSON 문자열을 구독합니다.                                                  | useLiveQuery로 IndexedDB를 구독합니다.                                     |
| [퍼널 복구](../../../src/features/stories/new/hooks/use-creation-request-recovery.ts), [카드 폴링](../../../src/features/studio/menu/hooks/use-creation-progress-polling.ts) | 원 응답과 폴링이 저장소 상태를 확인하고 결과를 반영합니다.                                                           | 저장소 전환 성공을 기다린 뒤 해당 경로만 부수효과를 실행합니다.            |
| [회원 상태 정리](../../../src/features/auth/_shared/utils/clear-local-member-state.ts)                                                                                       | 로그아웃, 탈퇴, 세션 만료에서 동기식으로 제작 기록을 지웁니다.                                                       | 삭제 완료 및 이전 세션의 지연 쓰기 차단을 함께 처리합니다.                 |

## 구현 순서

### 1. 제작 전용 데이터베이스와 저장 함수

- 런타임 의존성은 `dexie`, `dexie-react-hooks`를 사용합니다. 구현 시 호환되는 안정 버전을 확인하고 lockfile에 고정합니다.
- DB 정의는 `src/features/stories/_shared/utils/creation-db.ts`에 둡니다. 범용 Repository 계층이나 다른 도메인용 저장소 추상화는 만들지 않습니다.
- 기존 `creation-request-storage.ts`의 타입, 입력 검증, 도메인 함수 이름을 가능한 범위에서 재사용합니다. 공개 읽기와 쓰기는 비동기로 바꾸고 모든 호출처를 함께 전환합니다. legacy JSON 파서는 이관에 계속 사용합니다.
- 제안 스키마는 `pendingCreations`와 `storyCompletions` 두 데이터 테이블 및 `metadata`입니다. 데이터 테이블의 기본 키는 `requestId`, metadata에는 이관 완료 표시와 세션 정리 세대값을 보관합니다.
- 최초 시각 없는 구 레코드는 날짜를 임의로 채우지 않습니다. 기존 배열 순서가 유지되도록 내부 정렬 순번을 보존하고, 기존 `sortByCreatedAtDesc`의 동률 및 날짜 없음 규칙을 유지합니다. 저장 순서 조회와 완성 중 초안의 지연 저장 차단에 필요한 인덱스만 둡니다.
- 브라우저에서만 DB를 열고 SSR에서는 접근하지 않습니다. DB 열기 실패나 차단을 빈 DB로 취급하거나 자동 삭제로 해결하지 않습니다.

### 2. 기존 사용자 데이터 이관

대상 키는 `manyak:pending-creation-request`, `manyak:story-completion-requests`입니다.

1. 제작 저장소의 최초 사용 전에 초기화를 기다립니다. 기존 단일 객체와 배열을 검증하며, 빈 값과 읽기 실패를 구분합니다.
2. 하나의 IndexedDB 트랜잭션에서 두 목록과 이관 완료 표시를 반영합니다. 여러 탭이 동시에 초기화해도 완료 표시를 다시 검사합니다. 이미 있는 Dexie 레코드는 덮어쓰지 않습니다.
3. 최초 시각, 입력, 선택, 요청 ID, 생성 결과, 완성 요청, createdStoryId를 보존합니다. 손상된 항목을 성공 이관으로 간주하여 원본 전체를 지우지 않습니다.
4. 트랜잭션 성공 후에만 읽어 둔 원문과 현재 localStorage 값이 같은지 확인하여 legacy 키를 정리합니다. 실패 시 원본을 보존합니다. 이관 완료 표시는 같은 데이터를 재삽입하여 삭제한 초안을 되살리는 일을 막습니다.
5. localStorage와 IndexedDB 사이에는 공통 트랜잭션이 없으므로 DB 커밋 후 legacy 정리가 실패하거나 탭이 종료되는 경우도 재진입으로 검증합니다.

`version().upgrade()`는 향후 IndexedDB 스키마 변경에 사용하고, 최초 localStorage 이관은 별도의 멱등 초기화로 처리합니다. 런타임의 localStorage 이중 쓰기나 무조건적인 폴백은 두 정본을 만들므로 추가하지 않습니다.

배포 전에 열린 구버전 탭은 계속 localStorage에 쓸 수 있습니다. 위 원문 비교만으로 구버전과 신버전의 동시 편집을 완전히 해결하지 못합니다. **구버전 탭 종료 또는 새로고침을 전제로 전환할지, 선행 호환 배포가 필요한지는 릴리스 전에 결정할 항목입니다.** 구버전으로 되돌려도 Dexie에만 있는 초안을 읽지 못하므로 코드 롤백만으로 데이터 롤백이 되는 것으로 보고하지 않습니다.

### 3. 상태 전환과 결과 반영의 트랜잭션

다음 로컬 연산을 전부 성공하거나 전부 취소하도록 묶습니다.

- 키워드 초안에서 생성 요청으로 전환, 재생성 시 소유 requestId 교체 및 최초 시각 전달
- 스토리라인 생성 결과를 편집 초안으로 교체
- 완성 요청 추가 및 제출한 초안 삭제
- 완성 실패 시 초안 복원 및 완성 요청 삭제
- 완료 storyId 확정, 레코드 삭제 선점, 두 제작 테이블의 회원 상태 정리

상태 확인과 쓰기를 같은 트랜잭션 안에서 실행합니다. 늦은 자동 저장이 생성 진행이나 완성 상태를 되돌리지 못하게 현재 단계와 관련 완성 요청을 검사합니다. 기존 초안의 저장은 존재를 전제로 갱신하여 다른 탭이 삭제한 초안을 다시 만들지 않으며, 새 초안 삽입과 기존 초안 갱신을 구분합니다.

원 POST 응답과 복구 폴링이 동시에 끝나도 실제 상태 전환에 성공한 경로만 기존 분석 이벤트, 서재 ID 저장, Query 무효화를 실행합니다. 네트워크 요청과 분석 호출은 DB 트랜잭션 밖에 둡니다. 로컬 DB와 서버 또는 localStorage 서재 사이의 정확히 한 번 실행을 트랜잭션이 보장한다고 가정하지 않습니다. 기존 멱등 ID 저장과 복구 정책을 유지합니다.

### 4. 자동 저장, 화면 이동, 재개

- 300ms 디바운스는 유지합니다. 저장 예약과 실제 커밋을 구분하고, `persist`와 `flush`가 완료를 기다릴 수 있도록 바꿉니다.
- 같은 퍼널의 쓰기는 순서대로 처리하되 대기 중인 편집값은 최신 값만 유지합니다. 앞선 쓰기가 완료되어도 더 최신 입력이 남아 있으면 저장됨으로 표시하지 않습니다. 실패는 저장 성공으로 표시하지 않습니다.
- 명시적 화면 이탈과 생성 단계 전환은 필요한 저장 완료 후 진행합니다. 생성 버튼의 중복 실행 방지는 비동기 저장을 기다리기 전부터 적용합니다.
- `visibilitychange(hidden)`와 `pagehide`에서는 예약 저장을 시작하되, 이벤트 반환을 늦추는 것으로 브라우저 종료를 막거나 저장 완료를 보장하지 않습니다.
- `useStoryCreateDraft`는 로딩, 없음, 실패를 구분합니다. 재개 의도가 있으면 이관과 조회가 완료될 때까지 자동 저장과 생성 제출을 막아 빈 초기값이 복원할 초안을 덮지 못하게 합니다. 재개 의도는 정상 판정 후 소비하고 조회 실패 때 먼저 지우지 않습니다.
- 카드에서 이어서 만들기는 해당 requestId만 복원합니다. 직접 URL 진입과 새로고침은 기존 계약대로 새 세션이며 기존 초안은 제작 목록에 남습니다.

### 5. 구독과 회원 상태 정리

- 제작 목록과 퍼널 복구의 저장소 구독은 useLiveQuery로 바꿉니다. 문서 가시성 구독과 TanStack Query 서버 폴링은 기존 수단을 유지합니다.
- IndexedDB 조회 중을 빈 목록으로 바꾸지 않습니다. 기존 스켈레톤과 오류 표현을 재사용하고, 새 카피가 필요하면 Spec에서 먼저 확정합니다.
- `created-story-list.tsx`의 기존 Effect 내 완료 기록 정리는 비동기로 바꾸고, 서버 목록에 나타난 storyId로 중복 노출을 즉시 막은 뒤 비동기로 정리합니다. 카드 삭제도 DB 성공을 기다립니다.
- `clearLocalMemberState`와 호출처인 `my-screen.tsx`, `account-deletion-screen.tsx`, `session-expiry-watcher.tsx`를 함께 전환합니다. 보안상 로그아웃을 DB 오류 때문에 취소하지 않되, 정리 실패를 숨기고 이전 계정의 데이터를 다시 표시하지 않게 합니다.
- 초기화 및 쓰기가 캡처한 세대값을 쓰기 트랜잭션 안에서 확인합니다. 세션 종료 시 metadata의 세대값 증가와 두 제작 테이블 삭제를 한 트랜잭션으로 처리하여 다른 탭과 지연 콜백의 이전 세션 쓰기를 거부합니다. 이전 세션의 콜백이 새 세대값을 다시 얻어 쓰지 않도록 호출 흐름까지 확인합니다.
- legacy 키도 함께 정리하고 이관 완료 표시는 유지하여 로그아웃 후 재이관으로 기록이 살아나지 않게 합니다. DB 접근 실패 상황의 세션 격리와 재시도도 완료 조건에 포함합니다.

## 계약 결정 및 릴리스 제약

1. **제출 직전 저장 실패:** [공통 Spec](../../../../knk-harness/docs/spec/3-1-client-spec.md)의 §3-1-4는 저장 실패 시 제출 차단을 요구하지만, [웹 Spec](../../../../knk-harness/docs/spec/3-2-web-spec.md)의 §3-2-3과 현재 코드는 화면에 남아 생성을 계속하고 성공 시 채팅방으로 이동하는 폴백을 가집니다. 사용자의 구현 진행 승인에 따라 권장안인 입력 보존과 제출 차단을 적용하고 웹 Spec을 공통 계약에 맞췄습니다.
2. **이탈 저장 실패:** 비동기 flush 실패 시 기존 입력과 화면을 유지합니다. 저장 실패와 조회 실패 문구는 상수, E2E, Spec에 함께 반영했습니다.
3. **구버전 탭과 롤백:** 일회 이관 이후 구버전 탭이 쓰는 데이터의 지원 범위를 릴리스 전에 확정합니다. 자동 병합이나 이중 쓰기를 이번 계획의 숨은 기본값으로 두지 않습니다.

공통 Spec은 이미 입력 보존과 제출 차단을 요구하므로 수정하지 않았습니다. 별도 서버 API나 Android 계약 변경은 없습니다.

## 검증 계획

기존 Vitest와 Playwright를 사용합니다. Node 환경의 실제 Dexie 트랜잭션 검증에는 devDependency `fake-indexeddb`를 사용하고, 실제 브라우저 동작은 E2E로 확인합니다. hand-written DB mock으로 트랜잭션 성공을 대신하지 않습니다.

| 검증           | 핵심 사례                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 이관           | 단일 객체, 다중 초안, 완성 기록, 날짜 없는 순서, 손상 데이터 원본 보존, 재실행, 여러 탭 초기화, 중간 실패 후 재진입, 최신 DB 값 보존 |
| 트랜잭션       | 요청 전환 중 실패의 rollback, 완성 실패 복원, 오래된 초안 쓰기 거부, 원 응답과 폴링의 결과 선점                                      |
| 자동 저장      | 300ms 최신 값, 느린 쓰기 중 추가 입력, 이전 완료가 최신 저장 상태를 바꾸지 않음, 명시적 flush 대기, 실패 후 입력 유지                |
| 화면           | 이어서 만들기, 직접 진입, 새로고침, 다중 초안과 다중 완성, 정렬과 최초 시각, 완료 카드 중복 방지, 로딩과 오류 구분                   |
| 다중 탭과 인증 | 다른 초안의 동시 수정, 동일 초안 삭제 후 지연 저장, 로그아웃 중 쓰기 및 응답 도착, 세션 만료, 탈퇴, 계정 전환 후 이전 내용 차단      |
| 브라우저       | Chromium과 WebKit에서 실제 IndexedDB, 저장 차단 및 quota 오류, 백그라운드 복귀. 에뮬레이션 통과는 모바일 실기기 통과와 구분          |

기존 `tests/features/stories/_shared/utils/creation-request-storage.test.ts`, `tests/features/stories/new/utils/draft-autosave.test.ts`, `tests/features/stories/_shared/utils/creation-side-effects.test.ts`를 전환합니다. 이관 테스트는 별도 파일로 추가할 수 있습니다.

`e2e/fixtures/storage.ts`의 제작 데이터 주입은 완료를 기다릴 수 있는 IndexedDB 준비로 전환합니다. localStorage seed는 legacy 이관 전용 테스트에 남기며 매 navigation마다 구 데이터를 다시 넣지 않습니다. 기존 제작, 초안, 복구, 로그인 게이트 스펙과 인증 정리 관련 테스트를 함께 확인합니다. WebKit은 현재 실행 범위를 확인하여 핵심 저장 회귀가 실제로 실행되도록 지정합니다.

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:e2e e2e/stories/story-create.spec.ts e2e/stories/story-create-draft.spec.ts e2e/stories/story-create-recovery.spec.ts e2e/stories/story-login-gate.spec.ts
# 화면 및 훅 변경을 포함하므로 커밋 직전 전체 E2E를 통과시킵니다.
pnpm test:e2e
```

통과한 검사는 코드 변경이나 새로운 실패 근거가 없으면 반복하지 않습니다. UI를 의도적으로 바꾸면 Docker 기반 `pnpm test:e2e:visual:update`와 관련 기준 이미지를 함께 검증합니다.

## 하네스 동기화

- [웹 Spec](../../../../knk-harness/docs/spec/3-2-web-spec.md): 비동기 초기화, 저장 완료와 이탈, 이관 및 실패 계약을 반영합니다. 공통 Spec과 충돌하는 정책은 결정 후 함께 정리합니다.
- [웹 Design](../../../../knk-harness/docs/design/1-1-web-design.md): 두 localStorage 목록을 Dexie DB, 이관, 트랜잭션, 구독 및 세션 정리 구조로 교체합니다.
- [웹 ADR](../../../../knk-harness/docs/adr/1-2-web-adr.md): 구현 시 다음 미사용 ID로 후속 결정을 추가합니다. W-017의 localStorage 저장 결정 중 대체 범위를 명시하고 기존 Accepted 기록은 보존합니다.
- [스토리 QA](../../../../knk-harness/docs/qa/stories.md): STORY-DRAFT, STORY-FINAL, STORY-RECOVER 관련 케이스와 신규 이관 및 다중 탭 검증을 연결합니다. [인증 QA](../../../../knk-harness/docs/qa/auth.md)에는 로그아웃과 계정 격리 검증을 연결합니다.
- 현재 `docs/planning/client-tracking.md`는 없습니다. 작업 상태와 검증 근거는 Jira와 이 계획에 남깁니다. 백엔드와 Android 소유 문서는 변경하지 않습니다.

## 설계 근거

- [Dexie 트랜잭션](https://dexie.org/docs/Dexie/Dexie.transaction%28%29)
- [useLiveQuery와 같은 origin의 변경 구독](https://dexie.org/docs/dexie-react-hooks/useLiveQuery%28%29)
- [Dexie 스키마 업그레이드](https://dexie.org/docs/Version/Version.upgrade%28%29)
- [IndexedDB 종료와 비동기 저장 제약](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)

## 구현 결과 및 검증

- Dexie 4.4.6, dexie-react-hooks 4.4.0, 테스트용 fake-indexeddb 6.2.5를 적용했습니다.
- 이관, 상태 전환, 삭제 및 세션 정리를 실제 트랜잭션으로 처리합니다. 초기화는 실시간 조회 밖에서 마치고, 목록 읽기는 한 트랜잭션에서 처리합니다.
- 생성 응답 직후 useLiveQuery의 이전 스냅샷이 복구 조회를 재개하던 경합을 막았습니다. 재생성 실패 시 이전 결과를 유지하고 기존 정상 흐름 E2E 61개가 통과했습니다.
- 최종 검증(2026-09-26): `pnpm typecheck`, `pnpm lint`, `pnpm test` 모두 통과. 단위 테스트 106개 파일 715개 통과. `pnpm test:e2e --reporter=line`은 402개 통과, 기존 조건부 비활성 1개 제외(총 403개). Chromium과 WebKit의 신규 이관, 조회 실패, quota 실패, 다중 탭, 세대 변경 검증을 포함합니다.
- 생성 성공 응답의 초안 저장이 실패할 때에도 복구 조회가 계속되는 회귀를 추가했습니다. QA 신규 ID와 수정 문서의 상대 링크 및 앵커 31개, 양쪽 저장소 `git diff --check`를 확인했습니다. 정적 디자인 변경은 없으며 비주얼 스냅샷 및 실기기 검증은 실행하지 않았습니다.
- 웹 Spec, Design, ADR W-019, 스토리 및 인증 QA를 동기화했습니다. 사용자 계약이 이미 일치하는 공통 Spec, 서버 및 Android 문서는 변경하지 않았습니다.
- 전체 E2E는 API mock 및 Chromium/WebKit 에뮬레이션입니다. 실제 iOS/Android 저장소 정책, 실제 인증 계정 전환, 배포 전 구버전 탭 및 롤백 운영은 별도 검증입니다.
- 구현 검증 이후 사용자 요청에 따라 계획 기록, 의존성, 제작 저장소와 호출부, 브라우저 회귀 검증, 하네스 문서를 별도 로컬 커밋으로 분리합니다. 푸시와 PR 생성은 이번 요청 범위에 포함하지 않습니다.
