import type { PutStoryDraftRequest } from '@/api/generated/models';
import type { GeneralDraftRecord } from '@/features/stories/_shared/utils/creation-request-storage';
import { readDraftSaveError } from '@/features/stories/_shared/utils/story-draft-response';
import { toGeneralDraftRequest } from '@/features/studio/_shared/utils/general-draft-payload';

type MigrationDeps = {
  /** 서버 임시 저장 PUT이다. */
  put: (draftId: string, body: PutStoryDraftRequest) => Promise<unknown>;
  /** 기기 안 레코드를 지운다. */
  take: (requestId: string) => Promise<boolean>;
};

/**
 * 기기 안에 남은 일반 제작 임시 저장본을 같은 ID의 서버 초안으로 옮긴다. 하나씩 순서대로 올리고,
 * 서버에 들어갔거나(성공) 이미 있으면(버전 충돌) 기기 안 레코드를 지운다. 개수 상한에 걸리면 남은 레코드는
 * 기기에 그대로 두고 멈추며, 그 밖의 실패는 그 레코드만 남긴다.
 *
 * @param records 기기 안 일반 제작 임시 저장본
 * @param deps 서버 저장과 기기 안 삭제
 * @returns 기기에서 지운 레코드 수
 */
export async function migrateLocalGeneralDrafts(
  records: GeneralDraftRecord[],
  { put, take }: MigrationDeps,
): Promise<number> {
  let migrated = 0;

  for (const record of records) {
    try {
      await put(record.requestId, toGeneralDraftRequest(record.snapshot, null));
    } catch (error) {
      const failure = readDraftSaveError(error);

      if (failure.kind === 'limit') break;

      if (failure.kind !== 'conflict') continue;
    }

    if (await take(record.requestId).catch(() => false)) migrated += 1;
  }

  return migrated;
}
