import type {
  MigrationResponse,
  MigrationResult,
} from '@/api/generated/models';
import { MigrationResultStatus } from '@/api/generated/models';

/**
 * 이관 결과 목록에서 상태가 MIGRATED인 항목 수를 센다.
 *
 * @param results 이관 결과 목록(없으면 undefined)
 * @returns MIGRATED 상태 항목 수
 */
const countByMigrated = (results: MigrationResult[] | undefined): number =>
  results?.filter((result) => result.status === MigrationResultStatus.MIGRATED)
    .length ?? 0;

/**
 * 이관 완료 토스트("스토리 N개, 채팅 M개…")에 쓸 MIGRATED 건수를 센다.
 *
 * @param response 이관 API 응답
 * @returns 스토리·채팅별 MIGRATED 건수
 */
export function countMigrated(response: MigrationResponse): {
  storyCount: number;
  chatCount: number;
} {
  return {
    storyCount: countByMigrated(response.stories),
    chatCount: countByMigrated(response.chats),
  };
}
