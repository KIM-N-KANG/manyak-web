/**
 * 라우트 파라미터 값을 숫자로 안전하게 파싱한다.
 * 값이 없거나 배열이거나 숫자가 아니면 NaN을 반환한다.
 */
export function safeParseInt(value: string | string[] | undefined): number {
  if (!value || Array.isArray(value)) {
    return NaN;
  }

  const parsed = Number(value);

  return isNaN(parsed) ? NaN : parsed;
}
