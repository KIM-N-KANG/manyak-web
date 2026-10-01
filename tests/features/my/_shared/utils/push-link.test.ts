import { describe, expect, it } from 'vitest';

import { resolvePushLinkPath } from '@/features/my/_shared/utils/push-link';
import { isPushForCurrentUser } from '@/features/my/_shared/utils/push-recipient';

describe('resolvePushLinkPath', () => {
  it('운영 origin 링크는 경로와 쿼리만 남긴다', () => {
    expect(resolvePushLinkPath('https://manyak.app/stories/12?from=push')).toBe(
      '/stories/12?from=push',
    );
  });

  it('현재 origin 링크도 허용한다', () => {
    expect(
      resolvePushLinkPath(
        'http://localhost:3000/my/credits',
        'http://localhost:3000',
      ),
    ).toBe('/my/credits');
  });

  it('다른 origin·잘못된 링크·빈 값은 열지 않는다', () => {
    expect(resolvePushLinkPath('https://evil.example/stories/1')).toBeNull();
    expect(resolvePushLinkPath('not a url')).toBeNull();
    expect(resolvePushLinkPath(undefined)).toBeNull();
  });
});

describe('isPushForCurrentUser', () => {
  it('수신자와 현재 회원이 같을 때만 true다', () => {
    expect(isPushForCurrentUser('u1', 'u1')).toBe(true);
    expect(isPushForCurrentUser('u1', 'u2')).toBe(false);
    expect(isPushForCurrentUser(undefined, 'u1')).toBe(false);
    expect(isPushForCurrentUser('u1', null)).toBe(false);
  });
});
