import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name)
        ? { name, value: cookieStore.get(name) as string }
        : undefined,
  }),
}));

import {
  HANDOFF_COOKIE_NAME,
  readHandoffCodeOnServer,
} from '@/lib/auth/handoff-cookie';

describe('readHandoffCodeOnServer', () => {
  beforeEach(() => cookieStore.clear());

  it('핸드오프 쿠키가 있으면 코드 원문을 반환한다', async () => {
    cookieStore.set(HANDOFF_COOKIE_NAME, 'code-123');
    await expect(readHandoffCodeOnServer()).resolves.toBe('code-123');
  });

  it('쿠키가 없으면 undefined를 반환한다', async () => {
    await expect(readHandoffCodeOnServer()).resolves.toBeUndefined();
  });
});
