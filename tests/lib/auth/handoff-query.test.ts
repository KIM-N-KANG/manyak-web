import { describe, expect, it } from 'vitest';

import { redactHandoffCode } from '@/lib/auth/handoff-query';

describe('redactHandoffCode', () => {
  it('쿼리로 실린 핸드오프 코드를 표식으로 바꾼다', () => {
    expect(
      redactHandoffCode('https://manyak.app/login/continue?handoff=secret-1'),
    ).toBe('https://manyak.app/login/continue?handoff=[redacted]');
  });

  it('뒤따르는 쿼리·프래그먼트는 남긴다', () => {
    expect(
      redactHandoffCode('/login/continue?handoff=secret-1&from=kakao#top'),
    ).toBe('/login/continue?handoff=[redacted]&from=kakao#top');
  });

  it('첫 파라미터가 아니어도 가린다', () => {
    expect(
      redactHandoffCode('/login/continue?from=kakao&handoff=secret-1'),
    ).toBe('/login/continue?from=kakao&handoff=[redacted]');
  });

  it('이름이 겹치는 다른 파라미터는 건드리지 않는다', () => {
    expect(redactHandoffCode('/login/continue?myhandoff=keep')).toBe(
      '/login/continue?myhandoff=keep',
    );
  });

  it('코드가 없으면 원문을 그대로 반환한다', () => {
    expect(redactHandoffCode('/login/continue')).toBe('/login/continue');
  });
});
