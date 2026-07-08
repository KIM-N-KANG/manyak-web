import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock 팩토리는 mock 대상 모듈 import 시점에 실행되므로, 참조하는 값은 vi.hoisted로 선언한다.
const cookieStore = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieStore.has(name)
        ? { name, value: cookieStore.get(name) as string }
        : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
}));

import {
  clearInviteCodeCookie,
  isValidInviteCode,
  readInviteCodeCookie,
  writeInviteCodeCookie,
} from '@/lib/auth/invite-cookie';

beforeEach(() => {
  cookieStore.clear();
});

describe('isValidInviteCode', () => {
  it('영숫자 코드는 유효하다', () => {
    expect(isValidInviteCode('CW6VZX7D')).toBe(true);
    expect(isValidInviteCode('abc123XY')).toBe(true);
  });

  it('빈 값·공백뿐인 값은 무효다', () => {
    expect(isValidInviteCode('')).toBe(false);
    expect(isValidInviteCode('   ')).toBe(false);
  });

  it('영숫자 외 문자가 섞이면 무효다', () => {
    expect(isValidInviteCode('code/../etc')).toBe(false);
    expect(isValidInviteCode('code with space')).toBe(false);
    expect(isValidInviteCode('한글코드')).toBe(false);
  });

  it('64자를 넘는 값은 무효다', () => {
    expect(isValidInviteCode('a'.repeat(64))).toBe(true);
    expect(isValidInviteCode('a'.repeat(65))).toBe(false);
  });
});

describe('writeInviteCodeCookie / readInviteCodeCookie', () => {
  it('유효한 코드를 저장하고 다시 읽는다', async () => {
    await writeInviteCodeCookie('CW6VZX7D');

    await expect(readInviteCodeCookie()).resolves.toBe('CW6VZX7D');
  });

  it('무효한 코드는 저장하지 않는다', async () => {
    await writeInviteCodeCookie('bad/../code');

    await expect(readInviteCodeCookie()).resolves.toBeNull();
  });

  it('쿠키가 없으면 null을 반환한다', async () => {
    await expect(readInviteCodeCookie()).resolves.toBeNull();
  });

  it('저장된 값이 손상돼 무효 형식이면 null을 반환한다', async () => {
    cookieStore.set('manyak_invite_code', 'tampered value!!');

    await expect(readInviteCodeCookie()).resolves.toBeNull();
  });
});

describe('clearInviteCodeCookie', () => {
  it('저장된 초대 코드 쿠키를 삭제한다', async () => {
    await writeInviteCodeCookie('CW6VZX7D');
    await clearInviteCodeCookie();

    await expect(readInviteCodeCookie()).resolves.toBeNull();
  });
});
