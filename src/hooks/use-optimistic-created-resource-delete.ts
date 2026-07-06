import { toast } from 'sonner';

import { FetchError } from '@/lib/custom-fetch';

type UseOptimisticCreatedResourceDeleteParams<Id> = {
  /** 삭제할 리소스 ID */
  id: Id;
  /** 로컬 저장소의 현재 스냅샷을 반환한다 */
  getSnapshot: () => string | null;
  /** 스냅샷 문자열을 ID 목록으로 파싱한다 */
  parseSnapshot: (snapshot: string | null) => Id[];
  /** 로컬 저장소에서 ID를 제거한다 */
  removeId: (id: Id) => void;
  /** 롤백 시 ID 목록을 로컬 저장소에 다시 쓴다 */
  writeIds: (ids: Id[]) => void;
  /** 서버에 삭제 요청을 보낸다 */
  deleteResource: () => Promise<unknown>;
  successMessage: string;
  failureMessage: string;
  onDeleteSuccess?: () => void;
};

/**
 * 로컬 저장소 기반 "내가 만든 리소스" 목록을 낙관적으로 삭제하는 핸들러를 반환하는 훅.
 * 로컬에서 먼저 ID를 제거한 뒤 서버 삭제를 시도하고, 실패하면 이전 목록으로 롤백한다.
 * 404는 이미 삭제된 것으로 간주해 성공으로 처리한다.
 */
export function useOptimisticCreatedResourceDelete<Id>({
  id,
  getSnapshot,
  parseSnapshot,
  removeId,
  writeIds,
  deleteResource,
  successMessage,
  failureMessage,
  onDeleteSuccess,
}: UseOptimisticCreatedResourceDeleteParams<Id>) {
  return async () => {
    const previousIds = parseSnapshot(getSnapshot());

    removeId(id);

    try {
      await deleteResource();
      toast.success(successMessage);
      onDeleteSuccess?.();
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        onDeleteSuccess?.();

        return;
      }

      writeIds(previousIds);
      toast.error(failureMessage);
    }
  };
}
