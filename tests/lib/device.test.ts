import { describe, expect, it } from 'vitest';

import { isIosDevice } from '@/lib/device';

describe('isIosDevice', () => {
  it('iPhone·iPad UA는 iOS다', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 5)).toBe(
      true,
    );
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 16_4)', 5)).toBe(true);
  });

  it('데스크톱 UA의 iPadOS는 터치 포인트로 잡는다', () => {
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(
      true,
    );
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0)).toBe(
      false,
    );
  });

  it('Android는 iOS가 아니다', () => {
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14)', 5)).toBe(false);
  });
});
