# KNK-1724 Safari 프로필 수정 화면 복귀

- 티켓: [KNK-1724](https://kimandkang.atlassian.net/browse/KNK-1724)
- 웹과 하네스 브랜치: `feat/KNK-1724-fix-safari-profile-back-navigation`
- 기준: 웹 `ea6e7d3`, 하네스 `8a343dc`. 각각 fetch한 `origin/dev`에서 분기했다.
- 범위: 공통 히스토리 이탈 처리, 프로필과 스토리 수정 복귀 E2E, Safari 실행 대상, 웹 Design과 QA.

## 원인과 재현

마이에서 프로필 수정 화면에 진입한 뒤 아무것도 고치지 않고 헤더 뒤로가기를 누르면 Mobile Safari에서 URL은 `/my`로 바뀌지만 프로필 수정 폼이 남았다. 저장 성공과 수정 내용 버리기에서도 같은 화면 복귀 누락을 확인했다. Mobile Chrome에서는 정상 복귀했다.

`confirmLeave`가 더미 기록과 실제 화면 기록을 한 번에 되감고, `pendingTraversal` 분기가 그 결과의 `popstate`를 소비했다. 캡처 리스너의 전파 중단으로 Next.js 라우터가 실제 화면 이동을 받지 못했다. 진단용 테스트에서 실제 이동 이벤트의 전파를 허용하면 Safari에서도 화면이 복귀했다.

## 구현 순서와 결과

1. 단위 테스트에 더미 기록 유무와 정리 진행 중 이탈의 마지막 `popstate`가 라우터에 전달되는 조건을 추가했다. 수정 전 세 케이스가 실패했다.
2. `confirmLeave`는 기존 `leave`를 재사용해 더미를 정리한 다음 `history.go(-1)`을 실행한다. 더미 정리 이벤트만 소비하고 마지막 화면 이동 이벤트는 전달한다.
3. 프로필의 수정 없는 헤더 뒤로가기와 직접 진입 복귀를 추가하고, 저장 및 수정 내용 버리기에서 실제 마이 화면 표시와 수정 폼 제거를 확인한다.
4. 같은 공통 함수를 사용하는 스토리 수정의 제작 목록 복귀와 수정 없는 저장 복귀도 실제 화면까지 확인한다.
5. 프로필과 스토리 수정 E2E를 Mobile Safari 기본 실행 대상에 포함하고 하네스의 구조 및 QA 연결을 동기화한다.

## 정본과 영향 범위

- [공통 프로필 계약](../../../../knk-harness/docs/domain/ACCOUNT/CLIENT/INFORMATION-ARCHITECTURE.md#화면과-진입)
- [웹 화면 전환 계약](../../../../knk-harness/docs/experience/WEB/INTERACTION-FLOWS.md#기록과-뒤로가기)
- [히스토리 처리 구조](../../../../knk-harness/docs/experience/WEB/EXECUTION.md#이동과-레이어-정리)
- [마이 QA](../../../../knk-harness/docs/domain/ACCOUNT/CLIENT/WEB/VERIFICATION.md#my-profile-프로필-수정-myprofileedit-fe-screen-008-knk-1148): MY-PROFILE-01, 04, 09, 10
- [스토리 QA](../../../../knk-harness/docs/domain/STORY/CLIENT/WEB/VERIFICATION.md): STORY-EDIT-03, 20

기존 복귀 계약을 복구하므로 Spec 변경 대상은 없다. 사용자 문구, API, 저장 데이터, 화면 디자인은 바꾸지 않는다. 공통 히스토리 코드를 변경하므로 타입 검사, 린트, 단위 테스트와 전체 로컬 E2E를 실행한다.

## 검증

- 수정 전 단위 회귀: 21개 중 새로 강화한 3개 실패, 기존 18개 통과.
- `pnpm typecheck && pnpm lint && pnpm test`: 타입 검사, 린트, 149개 파일의 단위 테스트 1,111개 통과.
- `pnpm test:e2e --reporter=line`: 611개 통과, 14개 건너뜀, 실패 없음. Mobile Safari의 프로필 6개와 스토리 수정 17개를 포함한다.
- 건너뛴 케이스는 별도 `E2E_SEO=1` 실행이 필요한 서버 렌더링 SEO와 기존 WebKit 조건부 제외다. 비주얼 회귀는 화면 디자인 변경이 없어 실행하지 않았다.
- 계획 문서의 정본 링크와 절 참조, 변경한 하네스 문서의 로컬 링크, QA ID 중복, 양쪽 `git diff --check`를 확인했다.
- 검증 환경은 로컬 프로덕션 빌드와 API 목을 사용하는 Mobile Chrome 및 Mobile Safari다. 실제 iPhone과 운영 배포는 별도 검증 대상이다.
