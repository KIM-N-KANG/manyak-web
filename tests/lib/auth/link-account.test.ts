import { describe, expect, it } from 'vitest';

import {
  parseLinkProviderId,
  parseLinkResult,
  serializeLinkResult,
  toLinkProviderId,
} from '@/lib/auth/link-account';

describe('toLinkProviderId / parseLinkProviderId', () => {
  it('provider를 link 프로바이더 id로 왕복 변환한다', () => {
    expect(toLinkProviderId('google')).toBe('link-google');
    expect(toLinkProviderId('kakao')).toBe('link-kakao');
    expect(parseLinkProviderId('link-kakao')).toBe('kakao');
  });

  it('로그인 프로바이더 id와 알 수 없는 값은 null을 반환한다', () => {
    expect(parseLinkProviderId('google')).toBeNull();
    expect(parseLinkProviderId('link-naver')).toBeNull();
    expect(parseLinkProviderId('')).toBeNull();
  });
});

describe('serializeLinkResult / parseLinkResult', () => {
  it('결과 페이로드를 쿠키 값으로 왕복 직렬화한다', () => {
    const payload = { result: 'success', provider: 'kakao' } as const;

    expect(parseLinkResult(serializeLinkResult(payload))).toEqual(payload);
  });

  it('세미콜론 등 쿠키 구분자가 값에 남지 않도록 인코딩한다', () => {
    const serialized = serializeLinkResult({
      result: 'linked_to_other_user',
      provider: 'google',
    });

    expect(serialized).not.toContain(';');
    expect(serialized).not.toContain('"');
  });

  it('손상된 값·알 수 없는 결과 코드는 null을 반환한다', () => {
    expect(parseLinkResult('not-json')).toBeNull();
    expect(
      parseLinkResult(
        encodeURIComponent(
          JSON.stringify({ result: 'nope', provider: 'google' }),
        ),
      ),
    ).toBeNull();
    expect(
      parseLinkResult(
        encodeURIComponent(
          JSON.stringify({ result: 'success', provider: 'naver' }),
        ),
      ),
    ).toBeNull();
    expect(
      parseLinkResult(encodeURIComponent(JSON.stringify(null))),
    ).toBeNull();
  });
});
