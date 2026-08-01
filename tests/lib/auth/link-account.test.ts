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
  it('cookies().set의 URI 인코딩을 거쳐 저장된 값이 클라이언트 파서로 복원된다', () => {
    const payload = { result: 'reauth_failed', provider: 'google' } as const;

    // Next의 cookies().set은 값을 encodeURIComponent로 직렬화하므로(stringifyCookie),
    // 브라우저에 저장되는 값은 serialize 결과를 한 번 더 인코딩한 형태다. 이 실제
    // 파이프라인을 거친 값이 복원돼야 한다 — serialize가 미리 인코딩하면 이중
    // 인코딩으로 파싱이 조용히 실패한다(KNK-740 연동 결과 무표시 버그).
    const storedInBrowser = encodeURIComponent(serializeLinkResult(payload));

    expect(parseLinkResult(storedInBrowser)).toEqual(payload);
  });

  it('인코딩을 거친 저장 값에는 쿠키 구분자가 남지 않는다', () => {
    const storedInBrowser = encodeURIComponent(
      serializeLinkResult({
        result: 'linked_to_other_user',
        provider: 'google',
      }),
    );

    expect(storedInBrowser).not.toContain(';');
    expect(storedInBrowser).not.toContain('"');
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
