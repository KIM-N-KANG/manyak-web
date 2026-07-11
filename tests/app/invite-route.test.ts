import { beforeEach, describe, expect, it, vi } from 'vitest';

// next/headers의 cookies()는 요청 스코프 밖에서 예외를 던지므로, 쿠키를 다루는
// 모듈을 목킹해 라우트 핸들러를 요청 컨텍스트 없이 단위 테스트한다(api-proxy-route와 동일).
const inviteCookieMock = vi.hoisted(() => ({
  writeInviteCodeCookie: vi.fn(),
}));
const tokenCookiesMock = vi.hoisted(() => ({
  hasNextAuthSessionCookie: vi.fn(),
}));

vi.mock('@/lib/auth/invite-cookie', () => inviteCookieMock);
vi.mock('@/lib/auth/token-cookies', () => tokenCookiesMock);

import { GET } from '@/app/invite/[code]/route';

const inviteRequest = (code: string) =>
  GET(new Request(`http://localhost:3000/invite/${code}`), {
    params: Promise.resolve({ code }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  tokenCookiesMock.hasNextAuthSessionCookie.mockResolvedValue(false);
});

describe('GET /invite/[code]', () => {
  it('초대 코드를 쿠키에 저장하고 로그인 페이지로 redirect한다', async () => {
    const response = await inviteRequest('CW6VZX7D');

    expect(inviteCookieMock.writeInviteCodeCookie).toHaveBeenCalledWith(
      'CW6VZX7D',
    );
    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe(
      '/login',
    );
  });

  it('이미 로그인된 사용자는 홈으로 redirect한다', async () => {
    tokenCookiesMock.hasNextAuthSessionCookie.mockResolvedValue(true);

    const response = await inviteRequest('CW6VZX7D');

    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/');
  });

  it('URL 인코딩된 코드는 디코드해 저장한다', async () => {
    // 경로 세그먼트는 인코딩된 채 들어올 수 있다. 디코드 후 형식 검증은 쿠키 모듈 몫.
    await inviteRequest('CW6%56ZX7D');

    expect(inviteCookieMock.writeInviteCodeCookie).toHaveBeenCalledWith(
      'CW6VZX7D',
    );
  });
});
