import { toast } from 'sonner';

import { FetchError } from '@/lib/custom-fetch';

type UseOptimisticCreatedResourceDeleteParams<Id> = {
  id: Id;
  getSnapshot: () => string | null;
  parseSnapshot: (snapshot: string | null) => Id[];
  removeId: (id: Id) => void;
  writeIds: (ids: Id[]) => void;
  deleteResource: () => Promise<unknown>;
  successMessage: string;
  failureMessage: string;
  onDeleteSuccess?: () => void;
};

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
