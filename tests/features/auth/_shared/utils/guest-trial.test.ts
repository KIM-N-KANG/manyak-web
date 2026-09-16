import { describe, expect, it } from 'vitest';

import {
  getTrialRemaining,
  isGuestTrialExhausted,
  toTrialRemaining,
} from '@/features/auth/_shared/utils/guest-trial';

describe('toTrialRemaining', () => {
  it('limit - used를 0 이상으로 돌려준다', () => {
    expect(toTrialRemaining({ used: 2, limit: 5 })).toBe(3);
    expect(toTrialRemaining({ used: 7, limit: 5 })).toBe(0);
  });

  it('used가 없으면 0으로 본다', () => {
    expect(toTrialRemaining({ limit: 5 })).toBe(5);
  });

  it('limit이 null이면 무제한(null)이다', () => {
    expect(toTrialRemaining({ used: 0, limit: null })).toBeNull();
  });

  it('항목이 없으면 undefined다', () => {
    expect(toTrialRemaining(undefined)).toBeUndefined();
    expect(toTrialRemaining({ used: 1 })).toBeUndefined();
  });
});

describe('getTrialRemaining', () => {
  it('응답 전이면 undefined다', () => {
    expect(getTrialRemaining(undefined, 'chatTurn')).toBeUndefined();
  });

  it('항목별 잔여를 꺼낸다', () => {
    expect(
      getTrialRemaining(
        { chatTurn: { used: 5, limit: 5 }, chatImage: { used: 1, limit: 5 } },
        'chatImage',
      ),
    ).toBe(4);
  });
});

describe('isGuestTrialExhausted', () => {
  const exhausted = { chatTurn: { used: 5, limit: 5 } };

  it('확정된 게스트가 소진했을 때만 true다', () => {
    expect(
      isGuestTrialExhausted('unauthenticated', exhausted, 'chatTurn'),
    ).toBe(true);
    expect(isGuestTrialExhausted('authenticated', exhausted, 'chatTurn')).toBe(
      false,
    );
    expect(isGuestTrialExhausted('loading', exhausted, 'chatTurn')).toBe(false);
  });

  it('응답 전이나 잔여가 있으면 false다', () => {
    expect(
      isGuestTrialExhausted('unauthenticated', undefined, 'chatTurn'),
    ).toBe(false);
    expect(
      isGuestTrialExhausted(
        'unauthenticated',
        { chatTurn: { used: 4, limit: 5 } },
        'chatTurn',
      ),
    ).toBe(false);
  });
});
