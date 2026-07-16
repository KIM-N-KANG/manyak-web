const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 마이그레이션 400 재제출 시 손상 ID를 걸러내기 위한 UUID 형식 검사(FE-SCREEN-008 예외 처리).
 *
 * @param value 검사할 문자열
 * @returns UUID 형식이면 true
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * 문자열 목록에서 UUID 형식만 남긴다.
 *
 * @param values 검사할 문자열 목록
 * @returns UUID 형식인 문자열만 담은 목록
 */
export function filterValidUuids(values: string[]): string[] {
  return values.filter(isUuid);
}
