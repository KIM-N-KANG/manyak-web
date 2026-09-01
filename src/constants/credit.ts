/**
 * 이프 수치를 아직 받지 못했을 때 문구에 채우는 자리표시 숫자.
 * 대체 정책값이 아니라 "아직 모른다"는 표시이며, 쓰는 쪽은 쉬머와 함께 그려 값이 아님을 드러낸다.
 */
export const CREDIT_AMOUNT_PLACEHOLDER = '000';

/**
 * 화면 문구에 넣을 이프 금액 문자열을 만든다. 값이 없으면 자리표시 숫자를 돌려준다.
 *
 * @param amount 서버 정책이 내려준 이프 금액. 조회 전·실패 시 `undefined`다.
 * @returns 천 단위 구분자가 적용된 금액 문자열 또는 자리표시 숫자
 */
export const formatCreditAmount = (amount: number | undefined) =>
  amount === undefined
    ? CREDIT_AMOUNT_PLACEHOLDER
    : amount.toLocaleString('ko-KR');
