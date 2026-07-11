import { expect, skipOnboarding, test } from '../fixtures/test';

// 프록시는 리프레시 확정 거절·복구 불가 시 응답에 이 헤더를 실어 클라이언트에 능동 로그아웃을 알린다.
const SESSION_EXPIRED_HEADER = 'x-manyak-session-expired';

const memberSession = {
  user: { id: 'user-1', name: '배고픈 송아지', image: null },
  expires: '2099-01-01T00:00:00.000Z',
};

test.describe('세션 만료 능동 로그아웃', () => {
  test('세션 만료 헤더를 받으면 로그인 페이지로 강제 이동한다', async ({
    page,
  }) => {
    await skipOnboarding(page);

    let loggedOut = false;

    // 세션 조회: 로그아웃 전엔 회원, signOut 이후엔 게스트(null)를 응답한다.
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({ json: loggedOut ? null : memberSession }),
    );
    // next-auth signOut 파이프라인(csrf → signout)을 목킹한다. 실제 서버처럼
    // 요청 본문의 callbackUrl(watcher가 지정한 redirectTo)을 그대로 돌려준다.
    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({ json: { csrfToken: 'test-csrf' } }),
    );
    await page.route('**/api/auth/signout', (route) => {
      loggedOut = true;

      const body = new URLSearchParams(route.request().postData() ?? '');

      return route.fulfill({
        json: { url: body.get('callbackUrl') ?? '/login' },
      });
    });

    // 회원 채팅 목록 응답에 만료 헤더를 실어 프록시의 능동 로그아웃 신호를 시뮬레이션한다.
    await page.route('**/api/v1/users/me/chats**', (route) =>
      route.fulfill({
        status: 200,
        headers: { [SESSION_EXPIRED_HEADER]: '1' },
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    );

    await page.goto('/chats');

    // 능동 로그아웃이 로그인 페이지로 강제 이동시키고, 도착 후 만료 안내 토스트를 띄운다.
    await page.waitForURL('**/login**');
    await expect(
      page.getByText('세션이 만료되어 로그아웃되었어요'),
    ).toBeVisible();
  });
});
