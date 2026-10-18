import { useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetUsersMeStoryDraftsQueryKey,
  getUsersMeStoryDraftsByDraftId,
  put,
} from '@/api/generated/endpoints/story-draft-controller/story-draft-controller';
import type { PutStoryDraftRequest } from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  DRAFT_SAVE_TOAST_ID,
  DRAFT_SAVED_TOAST_DURATION_MS,
} from '@/features/stories/_shared/components/draft-save-button';
import { readDraftSaveError } from '@/features/stories/_shared/utils/story-draft-response';
import { FetchError } from '@/lib/api-error';

/** 기준 버전을 받아 PUT 본문을 만든다. 충돌 뒤 덮어쓰기는 서버의 현재 버전으로 다시 만든다. */
type DraftBodyBuilder = (baseVersion: number | null) => PutStoryDraftRequest;

/** 충돌 다이얼로그가 덮어쓸 내용과 서버의 현재 버전이다. */
type PendingConflict = {
  toBody: DraftBodyBuilder;
  key: string;
  version: number;
};

/** 저장에 성공한 서버 초안의 버전과 처음 저장 시각이다. */
type SavedDraft = { version: number; createdAt: string };

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

/** 버튼과 단계 이동 저장이 실패했을 때 띄우는 토스트 문구다. 충돌은 다이얼로그로 묻는다. */
const SAVE_FAILURE_TOAST = {
  limit: TOAST_MESSAGE.STORY_DRAFT_LIMIT_EXCEEDED,
  tooLarge: TOAST_MESSAGE.STORY_DRAFT_TOO_LARGE,
  failed: TOAST_MESSAGE.STORY_DRAFT_SAVE_FAILED,
} as const;

type UseStoryDraftSaveOptions = {
  /** 세션 동안 고정된 초안 ID다. */
  draftId: string;
  /** 이어서 연 서버 저장본의 버전이다. 새 초안은 null이다. */
  initialVersion: number | null;
  /** 저장에 성공한 비교 키와 서버 응답의 버전, 처음 저장 시각을 받는다. 덮어쓰기 저장도 여기로 알린다. */
  onSaved: (key: string, saved: SavedDraft) => void;
};

/**
 * 임시 저장본을 서버에 저장하는 훅. 간편 제작과 일반 제작이 함께 쓴다. 저장은 한 번에 하나씩 순서대로 보내 앞 저장의
 * 버전을 다음 저장의 기준 버전으로 쓴다(겹친 저장이 같은 기준 버전으로 나가 자기 자신과 충돌하지 않게 한다).
 * 화면 숨김 저장은 keepalive로 보내고 실패를 알리지 않는다.
 *
 * @param options 초안 ID, 기준 버전, 저장 성공 콜백
 * @returns 저장 함수, 기준 버전 읽기와 바꾸기, 저장 중 여부, 충돌 다이얼로그 상태와 응답 함수
 */
export function useStoryDraftSave({
  draftId,
  initialVersion,
  onSaved,
}: UseStoryDraftSaveOptions) {
  const queryClient = useQueryClient();
  const versionRef = useRef(initialVersion);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [pendingCount, setPendingCount] = useState(0);
  const [conflict, setConflict] = useState<PendingConflict | null>(null);

  const write = async (
    toBody: DraftBodyBuilder,
    key: string,
    background: boolean,
  ): Promise<boolean> => {
    try {
      const body = toBody(versionRef.current);
      const response = await (background
        ? put(draftId, body, { keepalive: true })
        : put(draftId, body));
      const version = response.data.version ?? versionRef.current ?? 1;

      versionRef.current = version;
      onSaved(key, {
        version,
        createdAt: response.data.createdAt ?? new Date().toISOString(),
      });
      void queryClient.invalidateQueries({
        queryKey: getGetUsersMeStoryDraftsQueryKey(),
      });

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

        return write(toBody, key, background);
      }

      if (background) return false;

      if (failure.kind === 'conflict') {
        setConflict({ toBody, key, version: failure.version });
      } else {
        toast.error(SAVE_FAILURE_TOAST[failure.kind], {
          id: DRAFT_SAVE_TOAST_ID,
        });
      }

      return false;
    }
  };

  /**
   * 본문을 만들어 저장한다. 앞 저장이 끝난 뒤 보낸다.
   *
   * @param toBody 기준 버전을 받아 PUT 본문을 만드는 함수
   * @param key 저장 내용의 비교 키
   * @param options.background 화면 숨김 저장이면 참
   * @returns 저장에 성공하면 참
   */
  const save = (
    toBody: DraftBodyBuilder,
    key: string,
    { background = false }: { background?: boolean } = {},
  ): Promise<boolean> => {
    const run = queueRef.current.then(() => write(toBody, key, background));

    queueRef.current = run;
    setPendingCount((count) => count + 1);
    void run.finally(() => setPendingCount((count) => count - 1));

    return run;
  };

  /**
   * 충돌 다이얼로그의 저장하기다. 서버의 현재 버전을 기준으로 지금 내용을 덮어쓴다.
   *
   * @returns 저장에 성공하면 참
   */
  const overwrite = async () => {
    if (!conflict) return false;

    setConflict(null);
    versionRef.current = conflict.version;

    const saved = await save(conflict.toBody, conflict.key);

    if (saved) {
      toast.success(TOAST_MESSAGE.STORY_DRAFT_SAVED, {
        id: DRAFT_SAVE_TOAST_ID,
        duration: DRAFT_SAVED_TOAST_DURATION_MS,
      });
    }

    return saved;
  };

  return {
    save,
    setBaseVersion: (version: number | null) => {
      versionRef.current = version;
    },
    getBaseVersion: () => versionRef.current,
    isSaving: pendingCount > 0,
    isConflictOpen: conflict !== null,
    overwrite,
    keepServerDraft: () => setConflict(null),
  };
}
