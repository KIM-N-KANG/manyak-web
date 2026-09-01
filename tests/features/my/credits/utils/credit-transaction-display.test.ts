import { describe, expect, it } from 'vitest';

import type { CreditTransactionResponse } from '@/api/generated/models';
import {
  formatCreditAmount,
  formatCreditDateLine,
  resolveCreditReasonLabel,
  resolveCreditSubtitle,
} from '@/features/my/credits/utils/credit-transaction-display';

function createTransaction(
  overrides: Partial<CreditTransactionResponse> = {},
): CreditTransactionResponse {
  return {
    type: 'SPEND',
    reason: 'CHAT_TURN',
    amount: -20,
    title: '유운잔검기',
    expiresAt: null,
    createdAt: '2026-08-31T12:00:00Z',
    ...overrides,
  };
}

describe('resolveCreditReasonLabel', () => {
  it('원장 사유에 한국어 라벨을 붙인다', () => {
    expect(resolveCreditReasonLabel('ATTENDANCE_REWARD')).toBe(
      '출석 체크 보상',
    );
    expect(resolveCreditReasonLabel('STORY_CREATION')).toBe('스토리 완성');
  });

  it('라벨이 없는 사유는 기본 라벨로 대체한다', () => {
    expect(resolveCreditReasonLabel('PURCHASE')).toBe('이프 변동');
    expect(resolveCreditReasonLabel(undefined)).toBe('이프 변동');
  });
});

describe('formatCreditAmount', () => {
  it('획득은 +, 소모·소멸은 -를 붙이고 절대값에 천 단위 콤마를 쓴다', () => {
    expect(
      formatCreditAmount(createTransaction({ type: 'EARN', amount: 2000 })),
    ).toBe('+2,000');
    expect(
      formatCreditAmount(createTransaction({ type: 'SPEND', amount: -200 })),
    ).toBe('-200');
    expect(
      formatCreditAmount(createTransaction({ type: 'EXPIRE', amount: -1000 })),
    ).toBe('-1,000');
  });

  it('원장 부호가 분류와 어긋나도 부호는 분류를 따른다', () => {
    expect(
      formatCreditAmount(createTransaction({ type: 'EARN', amount: -350 })),
    ).toBe('+350');
  });
});

describe('resolveCreditSubtitle', () => {
  it('제목이 있으면 그대로 쓴다', () => {
    expect(resolveCreditSubtitle(createTransaction())).toBe('유운잔검기');
  });

  it('제목 없는 소모·사용 취소는 삭제된 스토리로 대체한다', () => {
    expect(resolveCreditSubtitle(createTransaction({ title: null }))).toBe(
      '삭제된 스토리',
    );
    expect(
      resolveCreditSubtitle(
        createTransaction({ type: 'EARN', reason: 'REFUND', title: null }),
      ),
    ).toBe('삭제된 스토리');
  });

  it('보상·소멸은 제목 줄을 그리지 않는다', () => {
    expect(
      resolveCreditSubtitle(
        createTransaction({
          type: 'EARN',
          reason: 'ATTENDANCE_REWARD',
          title: null,
        }),
      ),
    ).toBeNull();
    expect(
      resolveCreditSubtitle(
        createTransaction({ type: 'EXPIRE', reason: 'EXPIRE', title: null }),
      ),
    ).toBeNull();
  });
});

describe('formatCreditDateLine', () => {
  it('발생일만 있으면 발생일 한 줄이다', () => {
    expect(formatCreditDateLine(createTransaction())).toBe('2026-08-31');
  });

  it('만료일이 있으면 만료 표기를 함께 붙인다', () => {
    expect(
      formatCreditDateLine(
        createTransaction({
          type: 'EARN',
          reason: 'ATTENDANCE_REWARD',
          expiresAt: '2026-09-30T00:00:00Z',
        }),
      ),
    ).toBe('2026-08-31 · 2026-09-30 만료');
  });

  it('KST 자정 직후 적립은 UTC 전날이 아니라 그날 날짜로 적는다', () => {
    expect(
      formatCreditDateLine(
        createTransaction({
          type: 'EARN',
          reason: 'ATTENDANCE_REWARD',
          createdAt: '2026-09-01T15:10:00Z',
          expiresAt: '2026-10-01T15:10:00Z',
        }),
      ),
    ).toBe('2026-09-02 · 2026-10-02 만료');
  });

  it('날짜 형식이 예상과 다르면 그 줄을 만들지 않는다', () => {
    expect(
      formatCreditDateLine(createTransaction({ createdAt: 'unknown' })),
    ).toBeNull();
  });
});
