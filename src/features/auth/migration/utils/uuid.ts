const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 마이그레이션 400 재제출 시 손상 ID를 걸러내기 위한 UUID 형식 검사(FE-SCREEN-008 예외 처리). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function filterValidUuids(values: string[]): string[] {
  return values.filter(isUuid);
}
