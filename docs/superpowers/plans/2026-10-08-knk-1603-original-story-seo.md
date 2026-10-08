# KNK-1603 홈 검색 설명과 오리지널 스토리 SEO

- 티켓: [KNK-1603](https://kimandkang.atlassian.net/browse/KNK-1603)
- 웹과 하네스 브랜치: `feat/KNK-1603-improve-original-story-seo`
- 범위: 홈 설명과 canonical, 공개 오리지널 본문의 서버 렌더링, 작품별 미리보기, 기존 카드 링크 텍스트, 오류와 색인 회귀 검증.
- 추가 승인 범위: 전체 E2E에서 드러난 로그인 가입 대기 조회 경합과 채팅 추천 입력 중복을 수정하고 작업별로 커밋한다.
- 제외: 서비스 안내 개선, 신규 공개 페이지, 검색 노출 범위 확대, 검색 콘솔 변경, PR, 배포.

## 구현 순서와 결과

1. 홈 전용 `HOME_DESCRIPTION`을 추가하고 description, Open Graph, Twitter에 적용했다. canonical은 홈 페이지에서만 선언한다. 상위 메타데이터의 브랜드 이미지는 유지한다.
2. 기존 공개 오리지널 목록으로 판정한 뒤 현재 상세의 ID, 공개 여부와 등록 상태를 확인한다. 본문과 메타데이터는 요청 단위 React `cache`로 같은 조회를 재사용한다.
3. 기존 상세 화면에 공개 필드만 초기값으로 전달한다. Query 캐시에 넣지 않아 브라우저가 권한과 좋아요를 바로 다시 조회하며, 완료 전에는 채팅 시작을 비활성화한다.
4. 작품별 Twitter 메타데이터를 보완하고 카드 제목을 실제 링크 텍스트로 사용한다. 기존 클릭 영역과 이벤트를 유지한다.
5. 서버 조회와 브라우저 조회를 분리한 SSR 회귀 스펙, 메타데이터 및 공개 필드 선별 테스트를 추가했다.
6. 로그인 오류 화면의 정리 effect보다 가입 대기 조회가 먼저 시작되는 경합을 공용 조회 함수에서 막는다. 현재 URL이 `/login?error=...`이면 HTTP 요청 없이 반환한다. 정상 로그인과 다른 화면의 오류 쿼리는 계속 조회하며 단위 테스트로 구분한다.
7. 채팅 일반 입력의 추천 채우기와 강조 삽입은 값과 선택 범위를 함께 갱신하고 `useLayoutEffect`로 DOM 반영 직후 커서를 이동한다. 다음 프레임에 사용자의 전체 선택을 덮어쓰던 지연 동작을 제거했다. 기존 E2E에 프레임 제어를 적용해 수정 전 중복 입력 실패를 재현했다.

## 오류 처리의 한계

익명 상세 404는 미존재뿐 아니라 회원 소유 비공개 스토리에도 반환된다. 따라서 서버의 404를 페이지 `notFound()`로 바꾸지 않는다. 서버 조회 실패와 현재 비공개 상태는 공개 본문을 제외하고 `noindex, nofollow`로 응답하며, 인증된 클라이언트 조회는 계속한다. 클라이언트 404와 일시적 실패는 기존 안내와 재시도를 사용한다. 실제 미존재 URL을 HTTP 404로 확정하려면 백엔드가 접근 불가와 구별 가능한 계약을 제공해야 한다.

Next.js 스트리밍은 유지한다. 첫 HTML에 실제 본문 요소가 포함되지만 일반 브라우저에서 JavaScript를 끄면 Next.js의 스트리밍 컨테이너가 숨김 상태일 수 있다. HTML 본문 포함과 정상 브라우저의 표시를 각각 검증한다.

## 정본 문서

- [웹 검색 노출 계약](../../../../knk-harness/docs/spec/3-2-web-spec.md#문서-열람과-검색-노출)
- [웹 라우팅 설계](../../../../knk-harness/docs/design/1-1-web-design.md#라우팅-규칙)
- [W-029](../../../../knk-harness/docs/adr/1-2-web-adr.md#w-029)
- [스토리 QA](../../../../knk-harness/docs/qa/stories.md): STORY-LIST-43, STORY-DETAIL-26, 27, 51

기존 공통 화면 구성과 API 계약은 그대로여서 공통 client spec과 backend spec은 수정하지 않는다. 웹의 초기 렌더링과 버튼 대기 계약은 웹 spec에 기록한다.

추가 오류 수정은 기존 로그인 오류 정리 계약과 추천 입력 편집 계약을 복구하므로 추가 spec 변경 대상은 없다. 웹 design과 AUTH-CONSENT-24, CHAT-INPUT-17의 검증 기준을 갱신했다.

## 검증

- 홈 설명을 승인된 최종 문구로 교체하고 웹 스펙과 Jira에 동일하게 반영했다. 타입 검사, 린트, 단위 테스트 931개와 홈 첫 HTML E2E 1개를 다시 통과했다.
- `pnpm typecheck && pnpm lint && pnpm test`: 추가 오류 수정 후 최종 타입 검사, 린트, 단위 테스트 135개 파일의 934개 케이스 통과.
- `E2E_SEO=1 pnpm test:e2e e2e/seo/original-story-ssr.spec.ts --reporter=line`: 서버 조회용 로컬 목을 사용한다. 기본 E2E에서는 이 스펙을 건너뛴다. 7개 통과. 첫 HTML, 메타데이터, 브랜드 이미지 폴백, 썸네일 영역 클릭, 개인화 전환과 시작 버튼 대기, 서버 실패 후 복구를 확인했다.
- `pnpm test:e2e e2e/seo/crawler-indexing.spec.ts e2e/stories/story-list.spec.ts e2e/stories/story-detail.spec.ts e2e/stories/story-detail-footer.spec.ts e2e/stories/story-like.spec.ts --reporter=line`: 관련 E2E 72개 통과. 비주얼 스냅샷 검사는 실행하지 않았다.
- 추가 오류 수정 전 전체 `pnpm test:e2e --reporter=line`: 첫 실행은 491개 통과, 8개 건너뜀, 1개 실패였다. 재실행은 490개 통과, 8개 건너뜀, 2개 실패였다. 로그인 오류 화면의 가입 대기 GET 횟수가 기대 0회와 달리 1회였고, 재실행에서는 채팅 추천 입력을 수정하는 케이스에서 입력 문자열이 중복됐다. 건너뛴 8개에는 별도 실행하는 SEO SSR 7개가 포함된다.
- 로그인 실패 케이스를 코드 수정 없이 3회 반복하면 모두 통과했다. 변경 전 웹 기준 커밋을 임시 디렉터리에 복원한 전체 E2E에서도 동일한 로그인 요청 횟수 실패가 재현됐다(491개 통과, 1개 건너뜀, 1개 실패). 채팅 입력 실패는 이 기준 커밋 검사에서 재현되지 않았다. 수정 전 실패 근거로 남긴다.
- 두 오류 수정 후 전체 `pnpm test:e2e --reporter=line`은 492개 통과, 8개 건너뜀으로 성공했다. 프레임 제어로 강화한 채팅 입력 회귀와 로그인 오류 케이스를 포함한다. SEO SSR도 별도로 다시 실행해 7개 모두 통과했다.
- 하네스 변경 링크와 앵커, QA ID 중복, 계획 문서 링크 및 양쪽 `git diff --check` 통과. 기존 ADR 본문 보존을 확인했다.
- 0호선 운영 공개 API를 인증 없이 조회해 HTTP 200, `visibility: PUBLIC`, `status: PUBLISHED`, 제목과 설명 필드 존재를 확인했다. 구현 변경을 운영에 배포하거나 운영 색인을 검사한 것은 아니다.
- 검증 환경: 로컬 프로덕션 빌드, Mobile Chrome(Pixel 5)과 전체 E2E의 Mobile Safari(iPhone 13), 테스트 백엔드와 브라우저 API 목. 웹 기준 커밋은 `4d0357f69d69272a92fdcc44d18bd75ede637684`, 하네스 기준 커밋은 `14345d46133fd15ac4361f4baa5e6e5f10c28010`이다.
- 커밋 구분은 웹의 홈 설명과 카드 링크, 오리지널 상세 서버 렌더링, SEO E2E, 로그인 조회 수정, 채팅 입력 수정, 구현 기록의 6개 작업과 하네스의 SEO 문서, 추가 오류 수정 문서의 2개 작업이다.

## 근거와 운영 후속

확인 기준일은 2026-10-08이다. [Google 스니펫](https://developers.google.com/search/docs/appearance/snippet), [Google 사이트링크](https://developers.google.com/search/docs/appearance/sitelinks), [Next.js 메타데이터](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)를 확인했다. 설명 문구의 실제 노출 길이나 사이트링크의 선택과 순서는 보장하지 않는다. 배포 후 Search Console과 네이버 서치어드바이저에서 운영 응답과 색인을 별도로 확인한다.
