/** 이프 충전 화면의 탭 값. */
export const CREDIT_CHARGE_TAB = {
  PURCHASE: 'PURCHASE',
  FREE_CHARGE: 'FREE_CHARGE',
  HISTORY: 'HISTORY',
} as const;

export type CreditChargeTab =
  (typeof CREDIT_CHARGE_TAB)[keyof typeof CREDIT_CHARGE_TAB];

/** 처음 열 탭을 정하는 `?tab=` 쿼리 값. 서버 푸시 딥링크와 Android가 같은 값을 쓴다. */
const TAB_BY_QUERY = new Map<string, CreditChargeTab>([
  ['purchase', CREDIT_CHARGE_TAB.PURCHASE],
  ['free', CREDIT_CHARGE_TAB.FREE_CHARGE],
  ['history', CREDIT_CHARGE_TAB.HISTORY],
]);

/**
 * `?tab=` 쿼리 값으로 처음 열 탭을 정한다. 값이 없거나 모르는 값이면 구매 탭이다.
 *
 * @param value 쿼리 값. 같은 키가 여러 번 오면 배열이다
 * @returns 처음 열 탭
 */
export function resolveInitialCreditChargeTab(
  value: string | string[] | undefined,
): CreditChargeTab {
  return (
    (typeof value === 'string' && TAB_BY_QUERY.get(value)) ||
    CREDIT_CHARGE_TAB.PURCHASE
  );
}
