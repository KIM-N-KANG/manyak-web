/** 이관이 계정당 1회 제한으로 닫힌 userId 목록을 보관하는 로컬스토리지 키 */
export const MIGRATION_CLOSED_STORAGE_KEY = 'manyak:migration-closed-user-ids';

/**
 * 저장된 원본 문자열을 userId 배열로 파싱한다. 형식이 어긋난 값은 버린다.
 *
 * @param raw 로컬스토리지에 저장된 원본 문자열(없으면 null)
 * @returns 파싱된 userId 배열
 */
export function parseMigrationClosedUserIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

/**
 * 해당 계정의 이관이 닫힘으로 기록돼 있는지 반환한다.
 * SSR·localStorage 차단 시 false — 이관을 건너뛰는 쪽이 아니라 시도하는 쪽으로 폴백한다.
 *
 * @param userId 판정할 계정 ID
 * @returns 닫힘으로 기록돼 있으면 true
 */
export function isMigrationClosedFor(userId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return parseMigrationClosedUserIds(
      window.localStorage.getItem(MIGRATION_CLOSED_STORAGE_KEY),
    ).includes(userId);
  } catch {
    return false;
  }
}

/**
 * 해당 계정의 이관 닫힘을 기록한다. 서버의 `migrationClosed`는 영구 상태이므로,
 * 로컬 ID를 유지한 채 재방문마다 이관을 재호출·재안내하지 않기 위한 표시다.
 * localStorage 차단 시 조용히 무시한다.
 *
 * @param userId 기록할 계정 ID
 */
export function markMigrationClosedFor(userId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const current = parseMigrationClosedUserIds(
      window.localStorage.getItem(MIGRATION_CLOSED_STORAGE_KEY),
    );

    if (current.includes(userId)) {
      return;
    }

    window.localStorage.setItem(
      MIGRATION_CLOSED_STORAGE_KEY,
      JSON.stringify([...current, userId]),
    );
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 저장을 건너뛴다.
  }
}
