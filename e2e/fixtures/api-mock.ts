import type { Page } from '@playwright/test';

/**
 * 모든 백엔드 호출은 /api/[...path] 프록시를 거친다.
 * 스모크(빈 상태)에선 목록 API가 호출되지 않지만, 어떤 요청도 실서버로 새지 않도록 가로챈다.
 * 구체 응답이 필요한 테스트는 이 함수 호출 뒤 page.route를 추가 등록해 override한다.
 */
export async function mockApi(page: Page): Promise<void> {
  // page.route는 나중에 등록한 핸들러가 먼저 매칭되므로, 더 구체적인 라우트를
  // 나중에 등록해야 우선 적용된다.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  // NextAuth 세션 조회는 미인증 시 `null`을 응답한다(실서버 확인 완료).
  // 회원 시나리오는 mockMemberSession()이 이 라우트를 override한다.
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    });
  });
}
