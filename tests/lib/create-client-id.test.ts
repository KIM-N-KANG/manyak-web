import { afterEach, describe, expect, it, vi } from 'vitest';

import { createClientId } from '@/lib/create-client-id';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createClientId', () => {
  it('crypto.randomUUID가 있으면 그 값을 반환한다', () => {
    expect(createClientId()).toMatch(UUID_V4_PATTERN);
  });

  it('crypto.randomUUID가 없어도 UUID v4 형식을 반환한다', () => {
    // http://<LAN IP> 실기기 접속 같은 insecure origin에는 randomUUID가 없다.
    // 백엔드가 requestId를 UUID로 검증하므로(스펙 §4-3-8) 형식이 어긋나면 400이 난다.
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(
        globalThis.crypto,
      ),
    });

    expect(createClientId()).toMatch(UUID_V4_PATTERN);
  });

  it('crypto 자체가 없어도 UUID v4 형식을 반환한다', () => {
    vi.stubGlobal('crypto', undefined);

    expect(createClientId()).toMatch(UUID_V4_PATTERN);
  });

  it('연속 호출은 서로 다른 값을 반환한다', () => {
    vi.stubGlobal('crypto', undefined);

    expect(createClientId()).not.toBe(createClientId());
  });
});
