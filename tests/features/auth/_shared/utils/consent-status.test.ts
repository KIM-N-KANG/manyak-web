import { describe, expect, it } from 'vitest';

import type { UserConsentResponse } from '@/api/generated/models';
import {
  buildConsentRequest,
  getRequiredConsents,
  hasPendingConsent,
  isEveryRequiredChecked,
} from '@/features/auth/_shared/utils/consent-status';

const satisfied: UserConsentResponse = {
  terms: { requiredVersion: 'v1.2', needsConsent: false },
  privacy: { requiredVersion: 'v1.4', needsConsent: false },
  age14: { requiredVersion: '1', needsConsent: false },
};

const partiallyPending: UserConsentResponse = {
  terms: { requiredVersion: 'v1.3', needsConsent: true },
  privacy: { requiredVersion: 'v1.4', needsConsent: false },
  age14: { requiredVersion: '1', needsConsent: true },
};

describe('getRequiredConsents', () => {
  it('needsConsent가 true인 항목만 표시 순서대로 돌려준다', () => {
    expect(getRequiredConsents(partiallyPending)).toEqual([
      { key: 'terms', requiredVersion: 'v1.3' },
      { key: 'age14', requiredVersion: '1' },
    ]);
  });

  it('모두 동의한 응답·응답 없음은 빈 목록이다', () => {
    expect(getRequiredConsents(satisfied)).toEqual([]);
    expect(getRequiredConsents(undefined)).toEqual([]);
  });

  it('버전 없는 필요 항목은 제출할 수 없으므로 목록에 넣지 않는다', () => {
    expect(getRequiredConsents({ terms: { needsConsent: true } })).toEqual([]);
  });
});

describe('hasPendingConsent', () => {
  it('필요 항목이 하나라도 있으면 true다', () => {
    expect(hasPendingConsent(partiallyPending)).toBe(true);
    expect(hasPendingConsent(satisfied)).toBe(false);
    expect(hasPendingConsent(undefined)).toBe(false);
  });
});

describe('isEveryRequiredChecked', () => {
  const required = getRequiredConsents(partiallyPending);

  it('필요 항목을 전부 체크했을 때만 true다', () => {
    expect(isEveryRequiredChecked(required, new Set(['terms']))).toBe(false);
    expect(isEveryRequiredChecked(required, new Set(['terms', 'age14']))).toBe(
      true,
    );
  });

  it('필요 항목이 없으면 제출할 것이 없어 false다', () => {
    expect(isEveryRequiredChecked([], new Set())).toBe(false);
  });
});

describe('buildConsentRequest', () => {
  it('조회 응답의 requiredVersion만 싣고 이미 동의한 항목은 제외한다', () => {
    expect(buildConsentRequest(getRequiredConsents(partiallyPending))).toEqual({
      terms: 'v1.3',
      age14: '1',
    });
  });
});
