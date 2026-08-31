import type {
  CreditTransactionResponse,
  CreditTransactionResponseReason,
} from '@/api/generated/models';
import {
  CreditTransactionResponseReason as CreditReason,
  CreditTransactionResponseType as CreditType,
} from '@/api/generated/models';
import { formatDate } from '@/lib/format-date';

import {
  CREDIT_HISTORY_COPY,
  CREDIT_REASON_FALLBACK_LABEL,
  CREDIT_REASON_LABEL,
} from '../constants';

const DISPLAY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_SEPARATOR = ' · ';

/**
 * 원장 사유에 붙일 한국어 라벨을 반환한다.
 *
 * @param reason 서버가 내려준 사유 원문
 * @returns 사유 라벨. 모르는 사유는 기본 라벨로 대체한다
 */
export function resolveCreditReasonLabel(
  reason?: CreditTransactionResponseReason,
): string {
  return (
    (reason && CREDIT_REASON_LABEL[reason]) || CREDIT_REASON_FALLBACK_LABEL
  );
}

/** 획득 항목인지 여부. 부호와 강조색을 분류 하나로 정한다. */
export function isEarnedCredit(
  transaction: CreditTransactionResponse,
): boolean {
  return transaction.type === CreditType.EARN;
}

/**
 * 금액 표기를 만든다. 부호는 분류(`type`)가 정하고 값은 절대값을 쓴다 —
 * 응답의 `amount`에 실린 원장 부호를 그대로 옮기지 않는다.
 *
 * @param transaction 내역 한 건
 * @returns `+1,000` / `-20` 형태의 금액 문자열
 */
export function formatCreditAmount(
  transaction: CreditTransactionResponse,
): string {
  const sign = isEarnedCredit(transaction) ? '+' : '-';

  return `${sign}${Math.abs(transaction.amount ?? 0).toLocaleString('ko-KR')}`;
}

/**
 * 사유 아래에 붙일 대상 스토리 줄을 만든다.
 * 소모·사용 취소인데 제목이 없으면 삭제된 스토리이고, 보상·소멸은 이 줄을 그리지 않는다.
 *
 * @param transaction 내역 한 건
 * @returns 스토리 제목 또는 대체 문구. 그릴 줄이 없으면 null
 */
export function resolveCreditSubtitle(
  transaction: CreditTransactionResponse,
): string | null {
  if (transaction.title) {
    return transaction.title;
  }

  const isStoryRelated =
    transaction.type === CreditType.SPEND ||
    transaction.reason === CreditReason.REFUND;

  return isStoryRelated ? CREDIT_HISTORY_COPY.deletedStory : null;
}

/**
 * 발생일과 만료일 줄을 만든다. 소멸 항목의 만료일은 발생일이 아니라 회수된 로트의 실제 만료일이다.
 *
 * @param transaction 내역 한 건
 * @returns `2026-08-31 · 2026-09-30 만료` 형태의 문자열. 읽을 날짜가 없으면 null
 */
export function formatCreditDateLine(
  transaction: CreditTransactionResponse,
): string | null {
  const createdDate = toDisplayDate(transaction.createdAt);
  const expiresDate = toDisplayDate(transaction.expiresAt);

  const parts = [
    createdDate,
    expiresDate === null ? null : `${expiresDate} 만료`,
  ].filter((part) => part !== null);

  return parts.length > 0 ? parts.join(DATE_SEPARATOR) : null;
}

/** 서버 시각 문자열의 날짜 부분만 취한다. 형식이 예상과 다르면 그 줄을 그리지 않도록 null이다. */
function toDisplayDate(isoDate?: string | null): string | null {
  if (!isoDate) {
    return null;
  }

  const date = formatDate(isoDate);

  return DISPLAY_DATE_PATTERN.test(date) ? date : null;
}
