import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureException = vi.fn();
const setUser = vi.fn();
const setTag = vi.fn();
const addBreadcrumb = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
  setUser: (...args: unknown[]) => setUser(...args),
  setTag: (...args: unknown[]) => setTag(...args),
  addBreadcrumb: (...args: unknown[]) => addBreadcrumb(...args),
}));

import { FetchError } from '@/lib/api-error';

import {
  captureApiError,
  dropRecoverableApiError,
  identifyUser,
  recordAnalyticsBreadcrumb,
} from './sentry';

function abortError() {
  const error = new Error('aborted');

  error.name = 'AbortError';

  return error;
}

beforeEach(() => {
  captureException.mockClear();
  setUser.mockClear();
  setTag.mockClear();
  addBreadcrumb.mockClear();
});

describe('captureApiError', () => {
  it('5xx FetchError를 캡처하고 상태·URL·메서드를 태그로 단다', () => {
    captureApiError(new FetchError('fail', 503, null), {
      url: '/stories',
      method: 'GET',
    });

    expect(captureException).toHaveBeenCalledTimes(1);

    const [, options] = captureException.mock.calls[0];

    expect(options.tags).toMatchObject({
      api_url: '/stories',
      api_method: 'GET',
      http_status: 503,
    });
  });

  it('복구 가능한 4xx는 보내지 않는다', () => {
    captureApiError(new FetchError('bad request', 400, null), {
      url: '/stories',
    });

    expect(captureException).not.toHaveBeenCalled();
  });

  it('요청 중단(AbortError)은 보내지 않는다', () => {
    captureApiError(abortError(), { url: '/stories' });

    expect(captureException).not.toHaveBeenCalled();
  });

  it('네트워크 오류(비 FetchError)는 캡처한다', () => {
    captureApiError(new TypeError('Failed to fetch'), { url: '/stories' });

    expect(captureException).toHaveBeenCalledTimes(1);
  });
});

describe('dropRecoverableApiError', () => {
  const event = {} as Parameters<typeof dropRecoverableApiError>[0];

  it('4xx 응답 이벤트는 드롭한다', () => {
    expect(
      dropRecoverableApiError(event, {
        originalException: new FetchError('not found', 404, null),
      }),
    ).toBeNull();
  });

  it('5xx 응답 이벤트는 통과시킨다', () => {
    expect(
      dropRecoverableApiError(event, {
        originalException: new FetchError('server error', 500, null),
      }),
    ).toBe(event);
  });
});

describe('identifyUser', () => {
  it('device_id가 있으면 Sentry user로 설정한다', () => {
    identifyUser('device-1');

    expect(setUser).toHaveBeenCalledWith({ id: 'device-1' });
  });

  it('device_id가 없으면 설정하지 않는다', () => {
    identifyUser(undefined);

    expect(setUser).not.toHaveBeenCalled();
  });
});

describe('recordAnalyticsBreadcrumb', () => {
  it('이벤트명을 breadcrumb로 남기고 상관 키만 tag로 올린다', () => {
    recordAnalyticsBreadcrumb('client_chat_viewed', {
      screen_name: 'chat',
      chat_id: 'c1',
      turn_number: 3,
    });

    expect(addBreadcrumb).toHaveBeenCalledWith({
      category: 'analytics',
      message: 'client_chat_viewed',
      level: 'info',
      data: { screen_name: 'chat', chat_id: 'c1', turn_number: 3 },
    });
    expect(setTag).toHaveBeenCalledWith('screen_name', 'chat');
    expect(setTag).toHaveBeenCalledWith('chat_id', 'c1');
    // 상관 키가 아닌 turn_number는 tag로 올리지 않는다.
    expect(setTag).not.toHaveBeenCalledWith('turn_number', 3);
  });

  it('payload에 없는 상관 키는 비워서 이전 화면의 값이 남지 않게 한다', () => {
    recordAnalyticsBreadcrumb('client_chat_viewed', {
      screen_name: 'chat',
      chat_id: 'c1',
    });

    setTag.mockClear();

    // chat_id가 없는 화면으로 이동하면 이전 chat_id가 비워져야 한다.
    recordAnalyticsBreadcrumb('client_storyList_viewed', {
      screen_name: 'storyList',
    });

    expect(setTag).toHaveBeenCalledWith('screen_name', 'storyList');
    expect(setTag).toHaveBeenCalledWith('chat_id', undefined);
    expect(setTag).toHaveBeenCalledWith('story_id', undefined);
    expect(setTag).toHaveBeenCalledWith('creation_id', undefined);
  });
});
