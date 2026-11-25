# E2E 지침

`e2e/` 아래 스펙을 쓰거나 고칠 때 따릅니다. 경로는 저장소 루트 기준입니다. 언제 로컬에서 실행하는지와 개발 서버 규칙은 루트 `AGENTS.md`를 따릅니다.

- 스펙은 `e2e/` 아래 `*.spec.ts`로 둡니다. 브라우저별 실행 대상은 `playwright.config.ts`를 참고하세요.
- Playwright 기본 `test` 대신 `e2e/fixtures/test.ts`의 확장 fixture를 import 하세요(API 목킹 자동 적용). 온보딩 스킵 등 헬퍼는 `e2e/fixtures/storage.ts`에 있습니다.
- 클라이언트 이동 뒤 페이지 제목은 Next 라우트 어나운서에도 노출되므로 `page.getByRole('banner').getByText(...)`처럼 헤더로 범위를 좁혀 단언합니다.
- **사용자 문구를 단언할 때는 리터럴 대신 상수를 import 하세요.** `e2e/`에서도 `@/` 별칭이 동작합니다.
- 화면 캡처 스펙은 `e2e/ui-capture/` 아래 `*-capture.spec.ts`입니다. E2E fixture로 화면의 **안정된 정적 상태**를 만들고 `toHaveScreenshot()`으로 캡처만 합니다. 기준 이미지는 커밋하지 않습니다. 시간 의존 값은 `page.clock.setFixedTime()`으로 고정하고, 동작과 요청 계약은 일반 E2E로 검증합니다.
