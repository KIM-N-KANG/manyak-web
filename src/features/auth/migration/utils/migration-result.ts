import type {
  MigrationResponse,
  MigrationResult,
} from '@/api/generated/models';
import { MigrationResultStatus } from '@/api/generated/models';

const countByMigrated = (results: MigrationResult[] | undefined): number =>
  results?.filter((result) => result.status === MigrationResultStatus.MIGRATED)
    .length ?? 0;

/** 이관 완료 토스트("스토리 N개, 채팅 M개…")에 쓸 MIGRATED 건수를 센다. */
export function countMigrated(response: MigrationResponse): {
  storyCount: number;
  chatCount: number;
} {
  return {
    storyCount: countByMigrated(response.stories),
    chatCount: countByMigrated(response.chats),
  };
}
