import { toast } from 'sonner';

import { FetchError } from '@/lib/custom-fetch';

type UseOptimisticCreatedResourceDeleteParams<Id> = {
  /** 삭제할 리소스 ID */
  id: Id;
  /** 게스트(로컬 ID 목록이 정본) 여부. 회원은 서버 목록이 정본이라 로컬 낙관 삭제를 건너뛴다 */
  isGuest: boolean;
  /** 로컬 저장소의 현재 스냅샷을 반환한다 */
  getSnapshot: () => string | null;
  /** 스냅샷 문자열을 ID 목록으로 파싱한다 */
  parseSnapshot: (snapshot: string | null) => Id[];
  /** 로컬 저장소에서 ID를 제거한다 */
  removeId: (id: Id) => void;
  /** 롤백 시 ID 목록을 로컬 저장소에 다시 쓴다 */
  writeIds: (ids: Id[]) => void;
  /** 회원 모드에서 서버 삭제가 확정된 뒤 회원 목록 쿼리를 갱신한다 */
  invalidateServerLists: () => void;
  /** 서버에 삭제 요청을 보낸다 */
  deleteResource: () => Promise<unknown>;
  successMessage: string;
  failureMessage: string;
  onDeleteSuccess?: () => void;
};

/**
 * "내가 만든 리소스"를 삭제하는 핸들러를 반환하는 훅.
 * 게스트는 로컬 ID를 먼저 제거(낙관적)한 뒤 서버 삭제를 시도하고 실패하면 롤백한다.
 * 회원은 서버 목록이 정본이므로 서버 삭제가 확정되면 회원 목록 쿼리를 무효화한다.
 * 404는 이미 삭제된 것으로 간주해 성공으로 처리한다.
 */
export function useOptimisticCreatedResourceDelete<Id>({
  id,
  isGuest,
  getSnapshot,
  parseSnapshot,
  removeId,
  writeIds,
  invalidateServerLists,
  deleteResource,
  successMessage,
  failureMessage,
  onDeleteSuccess,
}: UseOptimisticCreatedResourceDeleteParams<Id>) {
  return async () => {
    const previousIds = isGuest ? parseSnapshot(getSnapshot()) : [];

    if (isGuest) {
      removeId(id);
    }

    try {
      await deleteResource();

      if (!isGuest) {
        invalidateServerLists();
      }

      toast.success(successMessage);
      onDeleteSuccess?.();
    } catch (error) {
      if (error instanceof FetchError && error.status === 404) {
        if (!isGuest) {
          invalidateServerLists();
        }

        onDeleteSuccess?.();

        return;
      }

      if (isGuest) {
        writeIds(previousIds);
      }

      toast.error(failureMessage);
    }
  };
}
