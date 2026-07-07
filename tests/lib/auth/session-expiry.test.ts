import { describe, expect, it, vi } from 'vitest';

import {
  notifyIfSessionExpired,
  notifySessionExpired,
  SESSION_EXPIRED_HEADER,
  subscribeSessionExpired,
} from '@/lib/auth/session-expiry';

describe('session-expiry', () => {
  it('구독자는 notify 시 호출된다', () => {
    const listener = vi.fn();

    subscribeSessionExpired(listener);
    notifySessionExpired();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('여러 구독자 모두 호출된다', () => {
    const a = vi.fn();
    const b = vi.fn();

    subscribeSessionExpired(a);
    subscribeSessionExpired(b);
    notifySessionExpired();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('구독 해제 후에는 호출되지 않는다', () => {
    const listener = vi.fn();

    const unsubscribe = subscribeSessionExpired(listener);

    unsubscribe();
    notifySessionExpired();

    expect(listener).not.toHaveBeenCalled();
  });

  it('세션 만료 헤더 이름을 노출한다', () => {
    expect(SESSION_EXPIRED_HEADER).toBe('x-manyak-session-expired');
  });

  it('notifyIfSessionExpired는 만료 헤더가 1이면 알린다', () => {
    const listener = vi.fn();

    subscribeSessionExpired(listener);
    notifyIfSessionExpired(new Headers({ [SESSION_EXPIRED_HEADER]: '1' }));

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifyIfSessionExpired는 만료 헤더가 없으면 알리지 않는다', () => {
    const listener = vi.fn();

    subscribeSessionExpired(listener);
    notifyIfSessionExpired(new Headers());

    expect(listener).not.toHaveBeenCalled();
  });
});
