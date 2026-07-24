/**
 * 현재 로컬 ID 목록에서 이관된 ID만 제거해 남길 ID 목록을 만든다.
 * 핸드오프 이후 인앱에서 새로 만든 ID는 이관 목록에 없으므로 그대로 남는다(스펙 §3-10 흐름 8).
 *
 * @param current 현재 로컬에 저장된 공개 ID 목록
 * @param migrated 서버가 이번 핸드오프로 실제 이관한 공개 ID 목록
 * @returns 이관분을 제외하고 남길 ID 목록(원본 순서 보존)
 */
export function subtractMigratedIds(
  current: string[],
  migrated: string[],
): string[] {
  const migratedSet = new Set(migrated);

  return current.filter((id) => !migratedSet.has(id));
}
