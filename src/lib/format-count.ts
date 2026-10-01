/**
 * 카드 지표(채팅·좋아요 수)의 축약 표기. 반올림하면 실제보다 큰 수가 보이므로 버린다.
 */
const COMPACT_COUNT_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
  roundingMode: 'trunc',
});

/**
 * 수를 1K·1.2K·3.4M처럼 축약해 반환한다. 1,000 미만은 그대로 둔다.
 *
 * @param count 표시할 수
 * @returns 축약한 문자열
 */
export const formatCompactCount = (count: number): string =>
  COMPACT_COUNT_FORMATTER.format(count);
