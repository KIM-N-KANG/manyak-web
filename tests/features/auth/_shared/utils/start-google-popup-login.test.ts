import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  getSession: vi.fn(),
  me: vi.fn(),
  error: vi.fn(),
}));

vi.mock('next-auth/react', () => mocks);
vi.mock('@/api/generated/endpoints/auth/auth', () => ({ me: mocks.me }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));

import { startGooglePopupLogin } from '@/features/auth/_shared/utils/start-google-popup-login';
import { startSocialLogin } from '@/features/auth/_shared/utils/start-social-login';
import { POPUP_LOGIN_MESSAGE_TYPE } from '@/lib/auth/popup-login';

const origin = 'https://manyak.example';
let browser: EventTarget & {
  location: { origin: string; assign: ReturnType<typeof vi.fn> };
};
let popup: {
  closed: boolean;
  close: ReturnType<typeof vi.fn>;
  location: { href: string; replace: ReturnType<typeof vi.fn> };
};
let open: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  mocks.error.mockReset();
  mocks.signIn.mockReset().mockResolvedValue({
    url: 'https://accounts.google.com/o/oauth2/v2/auth',
    error: null,
  });
  mocks.getSession.mockReset().mockResolvedValue(null);
  mocks.me
    .mockReset()
    .mockResolvedValue({ status: 200, data: { id: 'user-1' } });
  popup = {
    closed: false,
    close: vi.fn(),
    location: { href: 'about:blank', replace: vi.fn() },
  };
  open = vi.fn(() => popup);
  browser = Object.assign(new EventTarget(), {
    location: { origin, assign: vi.fn() },
    open,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  });
  vi.stubGlobal('window', browser);
  vi.stubGlobal(
    'document',
    Object.assign(new EventTarget(), {
      hasFocus: () => true,
      visibilityState: 'visible',
    }),
  );
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function sendCompletion(overrides: Record<string, unknown> = {}) {
  const callbackUrl = mocks.signIn.mock.calls.at(-1)?.[1].redirectTo;
  const event = new Event('message');

  Object.assign(event, {
    origin,
    source: popup,
    data: {
      type: POPUP_LOGIN_MESSAGE_TYPE,
      attempt: new URL(callbackUrl).searchParams.get('attempt'),
      authenticated: true,
    },
    ...overrides,
  });
  browser.dispatchEvent(event);
}

describe('Auth.js Google 팝업 로그인', () => {
  it('클릭 중 팝업을 먼저 열고 원래 창의 두 인증 상태를 확인한 뒤 복귀한다', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });

    const result = startGooglePopupLogin('/stories/42?setting=1#detail');

    expect(open.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signIn.mock.invocationCallOrder[0],
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(popup.location.replace).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    sendCompletion();
    await expect(result).resolves.toBe('redirected');
    expect(mocks.me).toHaveBeenCalledOnce();
    expect(browser.location.assign).toHaveBeenCalledWith(
      '/stories/42?setting=1#detail',
    );
    expect(popup.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('출처, 창 참조, 시도 식별자가 다른 메시지는 인증 확인도 하지 않는다', async () => {
    const result = startGooglePopupLogin('/');

    await vi.advanceTimersByTimeAsync(0);
    sendCompletion({ origin: 'https://attacker.example' });
    sendCompletion({ source: {} });
    sendCompletion({
      data: {
        type: POPUP_LOGIN_MESSAGE_TYPE,
        attempt: 'old-attempt',
        authenticated: true,
      },
    });
    expect(mocks.getSession).not.toHaveBeenCalled();
    sendCompletion();
    await expect(result).resolves.toBe('failed');
    expect(browser.location.assign).not.toHaveBeenCalled();
  });

  it('팝업 성공 알림이 있어도 원래 창의 백엔드 계정이 다르면 성공으로 처리하지 않는다', async () => {
    mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.me.mockResolvedValue({ status: 200, data: { id: 'other-user' } });

    const result = startGooglePopupLogin('/');

    await vi.advanceTimersByTimeAsync(0);
    sendCompletion();
    await expect(result).resolves.toBe('failed');
    expect(browser.location.assign).not.toHaveBeenCalled();
  });

  it('팝업이 차단되면 OAuth 요청이나 현재 창 이동을 하지 않는다', async () => {
    open.mockReturnValue(null);
    await expect(startGooglePopupLogin('/')).resolves.toBe('failed');
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(browser.location.assign).not.toHaveBeenCalled();
  });

  it('취소 후 원래 창이 활성화되면 잠금을 풀고 재시도할 수 있다', async () => {
    const result = startGooglePopupLogin('/');

    await vi.advanceTimersByTimeAsync(0);
    popup.closed = true;
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe('failed');
    popup.closed = false;

    const retry = startGooglePopupLogin('/');

    await vi.advanceTimersByTimeAsync(0);
    sendCompletion();
    await expect(retry).resolves.toBe('failed');
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('동시에 두 팝업을 열지 않고 만료 후 도착한 결과는 무시한다', async () => {
    const result = startGooglePopupLogin('/');

    await expect(startGooglePopupLogin('/')).resolves.toBe('failed');
    expect(open).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1_000);
    await expect(result).resolves.toBe('failed');
    sendCompletion();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(browser.location.assign).not.toHaveBeenCalled();
  });

  it('OAuth 시작 요청이 실패하면 빈 팝업을 닫고 실패를 반환한다', async () => {
    mocks.signIn.mockRejectedValue(new Error('network'));
    await expect(startGooglePopupLogin('/')).resolves.toBe('failed');
    expect(popup.close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('서버가 반환한 임의 URL로 팝업을 보내지 않는다', async () => {
    mocks.signIn.mockResolvedValue({
      url: 'https://attacker.example',
      error: null,
    });
    await expect(startGooglePopupLogin('/')).resolves.toBe('failed');
    expect(popup.location.replace).not.toHaveBeenCalled();
  });

  it('OAuth 오류 페이지에 도착하면 원래 창을 유지하고 실패를 반환한다', async () => {
    const result = startGooglePopupLogin('/');

    await vi.advanceTimersByTimeAsync(0);
    popup.location.href = `${origin}/login?error=OAuthCallbackError`;
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe('failed');
    expect(browser.location.assign).not.toHaveBeenCalled();
  });
});

describe('인앱 소셜 로그인 진입', () => {
  it.each([
    'Android Instagram',
    'iPhone Instagram',
    'Android KAKAOTALK',
    'iPhone KAKAOTALK',
    'Android Barcelona',
    'iPhone Barcelona',
  ])(
    '%s에서 Google은 팝업을 시도하고 Kakao는 같은 탭에서 시작한다',
    async (userAgent) => {
      vi.stubGlobal('navigator', { userAgent });
      open.mockReturnValue(null);

      await expect(
        startSocialLogin({ provider: 'google', redirectTo: '/' }),
      ).resolves.toBe('failed');
      expect(open).toHaveBeenCalledOnce();
      expect(mocks.signIn).not.toHaveBeenCalled();
      expect(mocks.error).toHaveBeenCalledOnce();

      await expect(
        startSocialLogin({
          provider: 'kakao',
          redirectTo: '/chats/1?setting=2#end',
        }),
      ).resolves.toBe('redirected');
      expect(mocks.signIn).toHaveBeenCalledWith('kakao', {
        redirectTo: '/chats/1?setting=2#end',
      });
      expect(open).toHaveBeenCalledOnce();
    },
  );

  it('일반 브라우저의 Google 로그인은 기존 redirect를 유지한다', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla Android Chrome' });
    await expect(
      startSocialLogin({ provider: 'google', redirectTo: '/' }),
    ).resolves.toBe('redirected');
    expect(mocks.signIn).toHaveBeenCalledWith('google', { redirectTo: '/' });
    expect(open).not.toHaveBeenCalled();

    mocks.signIn.mockRejectedValueOnce(new Error('offline'));
    await expect(
      startSocialLogin({ provider: 'google', redirectTo: '/' }),
    ).resolves.toBe('failed');
    expect(mocks.error).toHaveBeenCalledOnce();
  });
});
