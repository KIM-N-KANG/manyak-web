import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetUsersMeStoryDraftsQueryKey,
  getUsersMeStoryDraftsByDraftId,
  put,
} from '@/api/generated/endpoints/story-draft-controller/story-draft-controller';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  DRAFT_SAVE_TOAST_ID,
  DRAFT_SAVED_TOAST_DURATION_MS,
} from '@/features/stories/_shared/components/draft-save-button';
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import { takePendingCreationRequest } from '@/features/stories/_shared/utils/creation-request-storage';
import { readDraftSaveError } from '@/features/stories/_shared/utils/story-draft-response';
import { toGeneralDraftRequest } from '@/features/studio/_shared/utils/general-draft-payload';
import type { GeneralStoryDraftSnapshot } from '@/features/studio/_shared/utils/general-story-draft';
import { FetchError } from '@/lib/api-error';

/** 충돌 다이얼로그가 덮어쓸 내용과 서버의 현재 버전이다. */
type PendingConflict = {
  snapshot: GeneralStoryDraftSnapshot;
  snapshotKey: string;
  version: number;
};

/**
 * 서버에서 초안이 없어졌는지(다른 곳에서 등록하거나 지움) 확인한다.
 *
 * @param draftId 초안 ID
 * @returns 상세 조회가 404면 참
 */
const isDraftGone = (draftId: string) =>
  getUsersMeStoryDraftsByDraftId(draftId).then(
    () => false,
    (error: unknown) => error instanceof FetchError && error.status === 404,
  );

/** 버튼과 탭 이동 저장이 실패했을 때 띄우는 토스트 문구다. 충돌은 다이얼로그로 묻는다. */
const SAVE_FAILURE_TOAST = {
  limit: TOAST_MESSAGE.STORY_DRAFT_LIMIT_EXCEEDED,
  tooLarge: TOAST_MESSAGE.STORY_DRAFT_TOO_LARGE,
  failed: TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED,
} as const;

type UseGeneralDraftSaveOptions = {
  /** 세션 동안 고정된 초안 ID다. */
  draftId: string;
  /** 이어서 연 서버 저장본의 버전이다. 새 초안과 기기 안 레거시 저장본은 null이다. */
  initialVersion: number | null;
  /** 같은 ID의 기기 안 레거시 저장본이 있으면 참이다. 서버에 처음 저장하면 지운다. */
  hasLocalDraft: boolean;
  /** 저장에 성공한 스냅숏 키를 받는다. 덮어쓰기 저장도 여기로 알린다. */
  onSaved: (snapshotKey: string) => void;
};

/**
 * 일반 제작 임시 저장본을 서버에 저장하는 훅. 저장은 한 번에 하나씩 순서대로 보내 앞 저장의 버전을 다음 저장의
 * 기준 버전으로 쓴다(겹친 저장이 같은 기준 버전으로 나가 자기 자신과 충돌하지 않게 한다).
 * 화면 숨김 저장은 keepalive로 보내고 실패를 알리지 않는다.
 *
 * @param options 초안 ID, 기준 버전, 레거시 저장본 여부, 저장 성공 콜백
 * @returns 저장 함수, 저장 중 여부, 충돌 다이얼로그 상태와 응답 함수
 */
export function useGeneralDraftSave({
  draftId,
  initialVersion,
  hasLocalDraft,
  onSaved,
}: UseGeneralDraftSaveOptions) {
  const queryClient = useQueryClient();
  const epoch = useCreationEpoch();
  const versionRef = useRef(initialVersion);
  const hasLocalDraftRef = useRef(hasLocalDraft);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [pendingCount, setPendingCount] = useState(0);
  const [conflict, setConflict] = useState<PendingConflict | null>(null);

  const write = async (
    snapshot: GeneralStoryDraftSnapshot,
    snapshotKey: string,
    background: boolean,
  ): Promise<boolean> => {
    try {
      const body = toGeneralDraftRequest(snapshot, versionRef.current);
      const response = await (background
        ? put(draftId, body, { keepalive: true })
        : put(draftId, body));

      versionRef.current = response.data.version ?? versionRef.current;
      onSaved(snapshotKey);
      void queryClient.invalidateQueries({
        queryKey: getGetUsersMeStoryDraftsQueryKey(),
      });

      // 이어서 연 기기 안 저장본은 서버로 옮겨졌으니 지운다. 지우지 못해도 목록이 서버 쪽을 남긴다.
      if (hasLocalDraftRef.current) {
        hasLocalDraftRef.current = false;
        void takePendingCreationRequest(draftId, epoch).catch(() => false);
      }

      return true;
    } catch (error) {
      const failure = readDraftSaveError(error);

      // 열어 둔 초안이 다른 곳에서 없어지면 서버는 기준 버전이 있는 저장을 거절한다. 입력을 잃지 않도록 새 초안으로 다시 저장한다.
      if (
        failure.kind === 'failed' &&
        versionRef.current !== null &&
        (await isDraftGone(draftId))
      ) {
        versionRef.current = null;

        return write(snapshot, snapshotKey, background);
      }

      if (background) return false;

      if (failure.kind === 'conflict') {
        setConflict({ snapshot, snapshotKey, version: failure.version });
      } else {
        toast.error(SAVE_FAILURE_TOAST[failure.kind], {
          id: DRAFT_SAVE_TOAST_ID,
        });
      }

      return false;
    }
  };

  /**
   * 스냅숏을 저장한다. 앞 저장이 끝난 뒤 보낸다.
   *
   * @param snapshot 저장할 폼 스냅숏
   * @param snapshotKey 스냅숏 비교 키
   * @param options.background 화면 숨김 저장이면 참
   * @returns 저장에 성공하면 참
   */
  const save = (
    snapshot: GeneralStoryDraftSnapshot,
    snapshotKey: string,
    { background = false }: { background?: boolean } = {},
  ): Promise<boolean> => {
    const run = queueRef.current.then(() =>
      write(snapshot, snapshotKey, background),
    );

    queueRef.current = run;
    setPendingCount((count) => count + 1);
    void run.finally(() => setPendingCount((count) => count - 1));

    return run;
  };

  const overwrite = async () => {
    if (!conflict) return;

    setConflict(null);
    versionRef.current = conflict.version;

    if (await save(conflict.snapshot, conflict.snapshotKey)) {
      toast.success(TOAST_MESSAGE.STORY_DRAFT_SAVED, {
        id: DRAFT_SAVE_TOAST_ID,
        duration: DRAFT_SAVED_TOAST_DURATION_MS,
      });
    }
  };

  return {
    save,
    isSaving: pendingCount > 0,
    isConflictOpen: conflict !== null,
    overwrite,
    keepServerDraft: () => setConflict(null),
  };
}
