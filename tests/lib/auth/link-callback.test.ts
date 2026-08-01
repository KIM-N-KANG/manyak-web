import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as BackendClient from '@/lib/auth/backend-client';

// vi.mock 팩토리가 참조하는 값은 호이스팅 TDZ를 피하려 vi.hoisted로 선언한다.
const cookieStoreMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

const headersMock = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

const backendSessionMock = vi.hoisted(() => ({
  ensureFreshAccessToken: vi.fn(),
}));

vi.mock('next/headers', () => headersMock);
vi.mock('@/lib/auth/backend-session', () => backendSessionMock);
// 함수만 목킹하고 BackendAuthError 클래스·code 파서는 실제 구현을 유지한다
// (실패 분류가 instanceof와 body 파싱에 의존하기 때문).
vi.mock('@/lib/auth/backend-client', async (importActual) => {
  const actual = await importActual<typeof BackendClient>();

  return {
    ...actual,
    fetchMeOnServer: vi.fn(),
    reauthenticateOnServer: vi.fn(),
    linkAccountOnServer: vi.fn(),
  };
});

import {
  BackendAuthError,
  fetchMeOnServer,
  linkAccountOnServer,
  reauthenticateOnServer,
} from '@/lib/auth/backend-client';
import {
  LINK_CODE_COOKIE,
  LINK_RESULT_COOKIE,
  type LinkAccountResult,
  parseLinkResult,
} from '@/lib/auth/link-account';
import { processLinkCallback } from '@/lib/auth/link-callback';

/**
 * 마지막으로 기록된 연동 결과 쿠키를 파싱해 반환한다. 기록이 없으면 null이다.
 */
function readWrittenResult(): {
  result: LinkAccountResult;
  provider: string;
} | null {
  const call = cookieStoreMock.set.mock.calls.findLast(
    ([name]) => name === LINK_RESULT_COOKIE,
  ) as [string, string] | undefined;

  return call ? parseLinkResult(call[1]) : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  headersMock.cookies.mockResolvedValue(cookieStoreMock);
  cookieStoreMock.get.mockReturnValue(undefined);
  backendSessionMock.ensureFreshAccessToken.mockResolvedValue({
    status: 'authenticated',
    accessToken: 'access-token',
  });
});

describe('processLinkCallback — 세션 전제', () => {
  it('로그인 세션이 없으면 아무 API도 호출하지 않고 error 결과를 남긴다', async () => {
    backendSessionMock.ensureFreshAccessToken.mockResolvedValue({
      status: 'guest',
    });

    await processLinkCallback('google', 'id-token');

    expect(fetchMeOnServer).not.toHaveBeenCalled();
    expect(readWrittenResult()).toEqual({
      result: 'error',
      provider: 'google',
    });
  });
});

describe('processLinkCallback — 재인증 단계', () => {
  beforeEach(() => {
    // 콜백 provider가 이미 연동돼 있으면 이 콜백은 재인증 단계다.
    vi.mocked(fetchMeOnServer).mockResolvedValue({
      linkedProviders: ['google'],
    });
  });

  it('링크 코드를 발급받아 httpOnly 쿠키로 보관하고 결과는 남기지 않는다', async () => {
    vi.mocked(reauthenticateOnServer).mockResolvedValue({
      linkCode: 'issued-code',
    });

    await processLinkCallback('google', 'id-token');

    expect(reauthenticateOnServer).toHaveBeenCalledWith(
      'access-token',
      'google',
      'id-token',
    );
    expect(linkAccountOnServer).not.toHaveBeenCalled();

    const [name, value, options] = cookieStoreMock.set.mock.calls[0] as [
      string,
      string,
      { httpOnly?: boolean; maxAge?: number },
    ];

    expect(name).toBe(LINK_CODE_COOKIE);
    expect(value).toBe('issued-code');
    expect(options.httpOnly).toBe(true);
    // 플로우가 계속되므로 이 단계에서는 결과를 확정하지 않는다.
    expect(readWrittenResult()).toBeNull();
  });

  it('재인증이 403이면 reauth_failed 결과를 남긴다', async () => {
    vi.mocked(reauthenticateOnServer).mockRejectedValue(
      new BackendAuthError(403, JSON.stringify({ code: 'REAUTH_FAILED' })),
    );

    await processLinkCallback('google', 'id-token');

    expect(readWrittenResult()).toEqual({
      result: 'reauth_failed',
      provider: 'google',
    });
  });

  it('링크 코드가 응답에 없으면 error 결과를 남긴다', async () => {
    vi.mocked(reauthenticateOnServer).mockResolvedValue({});

    await processLinkCallback('google', 'id-token');

    expect(readWrittenResult()).toEqual({
      result: 'error',
      provider: 'google',
    });
  });
});

describe('processLinkCallback — 연동 단계', () => {
  beforeEach(() => {
    // 콜백 provider가 아직 연동돼 있지 않으면 이 콜백은 연동 단계다.
    vi.mocked(fetchMeOnServer).mockResolvedValue({
      linkedProviders: ['google'],
    });
    cookieStoreMock.get.mockImplementation((name: string) =>
      name === LINK_CODE_COOKIE ? { value: 'stored-code' } : undefined,
    );
  });

  it('보관한 링크 코드로 연동하고 성공하면 코드를 지운 뒤 success를 남긴다', async () => {
    vi.mocked(linkAccountOnServer).mockResolvedValue(undefined);

    await processLinkCallback('kakao', 'id-token');

    expect(linkAccountOnServer).toHaveBeenCalledWith(
      'access-token',
      'kakao',
      'id-token',
      'stored-code',
    );

    const clearCall = cookieStoreMock.set.mock.calls.find(
      ([name]) => name === LINK_CODE_COOKIE,
    ) as [string, string, { expires?: Date }] | undefined;

    expect(clearCall?.[1]).toBe('');
    expect(readWrittenResult()).toEqual({
      result: 'success',
      provider: 'kakao',
    });
  });

  it('링크 코드가 없으면 연동을 시도하지 않고 reauth_failed를 남긴다', async () => {
    cookieStoreMock.get.mockReturnValue(undefined);

    await processLinkCallback('kakao', 'id-token');

    expect(linkAccountOnServer).not.toHaveBeenCalled();
    expect(readWrittenResult()).toEqual({
      result: 'reauth_failed',
      provider: 'kakao',
    });
  });

  it('409 PROVIDER_ALREADY_LINKED는 provider_already_linked를 남긴다', async () => {
    vi.mocked(linkAccountOnServer).mockRejectedValue(
      new BackendAuthError(
        409,
        JSON.stringify({ code: 'PROVIDER_ALREADY_LINKED' }),
      ),
    );

    await processLinkCallback('kakao', 'id-token');

    expect(readWrittenResult()).toEqual({
      result: 'provider_already_linked',
      provider: 'kakao',
    });
  });

  it('409 SOCIAL_ACCOUNT_LINKED_TO_OTHER_USER는 linked_to_other_user를 남긴다', async () => {
    vi.mocked(linkAccountOnServer).mockRejectedValue(
      new BackendAuthError(
        409,
        JSON.stringify({ code: 'SOCIAL_ACCOUNT_LINKED_TO_OTHER_USER' }),
      ),
    );

    await processLinkCallback('kakao', 'id-token');

    expect(readWrittenResult()).toEqual({
      result: 'linked_to_other_user',
      provider: 'kakao',
    });
  });

  it('403 실패는 링크 코드를 지우지 않아 만료 전 재시도를 살린다', async () => {
    vi.mocked(linkAccountOnServer).mockRejectedValue(
      new BackendAuthError(403, JSON.stringify({ code: 'REAUTH_FAILED' })),
    );

    await processLinkCallback('kakao', 'id-token');

    const clearCall = cookieStoreMock.set.mock.calls.find(
      ([name]) => name === LINK_CODE_COOKIE,
    );

    expect(clearCall).toBeUndefined();
    expect(readWrittenResult()).toEqual({
      result: 'reauth_failed',
      provider: 'kakao',
    });
  });

  it('예상하지 못한 실패는 error를 남긴다', async () => {
    vi.mocked(linkAccountOnServer).mockRejectedValue(new Error('network down'));

    await processLinkCallback('kakao', 'id-token');

    expect(readWrittenResult()).toEqual({ result: 'error', provider: 'kakao' });
  });
});
