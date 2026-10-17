'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { getUsersMeStoryDraftsByDraftId } from '@/api/generated/endpoints/story-draft-controller/story-draft-controller';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import type {
  DraftCreationRecord,
  PendingCreationRequest,
  StorylineGenerationRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  findPendingCreationRequest,
  initializeCreationStorage,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  clearDraftResumeIntent,
  peekDraftResumeIntent,
} from '@/features/stories/_shared/utils/draft-resume-intent';
import { readSimpleDraftDetail } from '@/features/stories/_shared/utils/simple-draft-payload';
import { readStoryDraftDetail } from '@/features/stories/_shared/utils/story-draft-response';
import { FetchError } from '@/lib/api-error';

/**
 * 진입 때 정한 세션의 저장 위치와 서버 초안 정보다. 서버 세션은 사용자 저장을 서버 초안에 쓰고, 기기 안 세션은
 * 지금처럼 IndexedDB에 쓴다. 새 세션의 draftId는 null이며 퍼널이 만든다.
 */
export type SimpleDraftSession = {
  storage: 'server' | 'local';
  draftId: string | null;
  version: number | null;
  createdAt: string | null;
};

/** 복원한 기록의 출처다. 서버에서 읽은 기록은 기기 안에 없으므로 퍼널이 소유 기록으로 잡지 않는다. */
export type DraftRestoreSource = 'local' | 'server';

type UseStoryCreateDraftArgs = {
  /** draft 레코드로 퍼널 상태를 복원한다. */
  onRestore: (record: DraftCreationRecord, source: DraftRestoreSource) => void;
  /** 진행 중이던 스토리라인 생성 레코드로 로딩 화면을 복원한다. 복구 조회는 복구 훅이 잇는다. */
  onRestorePending: (record: StorylineGenerationRecord) => void;
};

const NEW_SERVER_SESSION: SimpleDraftSession = {
  storage: 'server',
  draftId: null,
  version: null,
  createdAt: null,
};

const LOCAL_SESSION: SimpleDraftSession = {
  storage: 'local',
  draftId: null,
  version: null,
  createdAt: null,
};

/** 서버 초안을 찾지 못했을 때의 토스트 ID다. 진입 판정이 겹쳐도 한 번만 띄운다. */
const DRAFT_NOT_FOUND_TOAST_ID = 'simple-story-draft-not-found';

/**
 * 편집 자동 저장 레코드인지 판별한다.
 *
 * @param record 판별할 편집 초안 레코드
 * @returns 키워드 또는 스토리 편집 draft이면 true
 */
function isDraftCreationRecord(
  record: PendingCreationRequest | null,
): record is DraftCreationRecord {
  return record?.stage === 'KEYWORD_DRAFT' || record?.stage === 'STORY_DRAFT';
}

/**
 * 기기 안 기록으로 이어서 만들 때의 세션을 정한다. 회원이 서버 초안을 가리키는 기록으로 열면 서버 세션이고,
 * 게스트나 연결이 없는 기록(배포 전, 게스트 때 만든 초안)은 기기 안 세션이다.
 *
 * @param record 이어서 만들 기기 안 기록
 * @param isMember 회원 여부
 * @returns 세션
 */
function resolveLocalSession(
  record: PendingCreationRequest,
  isMember: boolean,
): SimpleDraftSession {
  const isLinked =
    (record.stage === 'STORYLINE_GENERATION' ||
      record.stage === 'STORY_DRAFT') &&
    record.draftId !== undefined;

  if (!isMember || !isLinked) return LOCAL_SESSION;

  return {
    storage: 'server',
    draftId: record.draftId ?? null,
    version: record.draftVersion ?? null,
    createdAt: record.createdAt ?? null,
  };
}

/**
 * 재개 의도가 가리키는 서버 초안을 읽는다. 찾지 못했거나(다른 곳에서 완성하거나 지움) 생성 결과를 받을 수 없으면
 * 안내한 뒤 null을 반환해 새로 만든다.
 *
 * @param draftId 서버 초안 ID
 * @returns 복원할 기록과 서버 세션. 찾지 못하면 null
 * @throws 서버 조회가 404 밖의 이유로 실패하거나 형식을 읽을 수 없는 경우
 */
async function resolveServerDraft(draftId: string): Promise<{
  record: DraftCreationRecord;
  session: SimpleDraftSession;
} | null> {
  try {
    const response = await getUsersMeStoryDraftsByDraftId(draftId);
    const detail = readStoryDraftDetail(response.data);
    const read = detail ? readSimpleDraftDetail(detail) : null;

    // 모르는 스키마 버전을 읽어 다시 저장하면 그 버전에만 있는 필드를 지우므로 열지 않는다.
    if (!detail || !read || read.kind === 'unreadable')
      throw new Error('Unreadable simple story draft');

    if (read.kind === 'ok') {
      return {
        record: read.record,
        session: {
          storage: 'server',
          draftId: detail.draftId,
          version: detail.version,
          createdAt: detail.createdAt,
        },
      };
    }
  } catch (error) {
    if (!(error instanceof FetchError) || error.status !== 404) throw error;
  }

  toast.error(TOAST_MESSAGE.STORY_DRAFT_NOT_FOUND, {
    id: DRAFT_NOT_FOUND_TOAST_ID,
  });

  return null;
}

/**
 * 퍼널 진입 시 재개 의도(세션스토리지 ID)를 읽어 그 기록만 복원하고 세션의 저장 위치를 정하는 훅.
 *
 * - 진행 카드 "이어서 만들기" 경유 진입이면 기기 안 기록을 먼저 찾고, 없고 회원이면 서버 초안을 읽는다.
 * - 그 외 진입은 항상 새 세션이다. 회원은 서버 세션, 게스트는 기기 안 세션이며 다른 초안은 건드리지 않는다.
 * - 회원 판정이 끝나기 전에는 진입을 끝내지 않고, 끝난 뒤에는 판정이 바뀌어도 다시 정하지 않는다.
 *
 * @param args 레코드 복원 콜백
 * @returns 진입 판정 완료 여부, 세션, 조회 실패 여부와 재시도 함수
 */
export function useStoryCreateDraft({
  onRestore,
  onRestorePending,
}: UseStoryCreateDraftArgs) {
  const { isMember, isGuest } = useMemberAccess();
  const access = isMember ? 'member' : isGuest ? 'guest' : null;
  const [session, setSession] = useState<SimpleDraftSession | null>(null);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacksRef = useRef({ onRestore, onRestorePending });
  // 판정이 끝나면 세션 동안 고정한다. 창으로 돌아올 때의 세션 재조회가 실패해 회원 판정이 흔들려도
  // 저장 위치와 draftId가 바뀌지 않게 한다. 다시 시도는 판정이 실패해 세션이 없을 때만 돈다.
  const isResolvedRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = { onRestore, onRestorePending };
  });
  useEffect(() => {
    if (access === null || isResolvedRef.current) return;

    let active = true;

    void (async () => {
      try {
        await initializeCreationStorage();

        const requestId = peekDraftResumeIntent();
        const current =
          requestId === null
            ? null
            : await findPendingCreationRequest(requestId);
        const isMemberAccess = access === 'member';
        const server =
          current === null && requestId !== null && isMemberAccess
            ? await resolveServerDraft(requestId)
            : null;

        if (!active) return;

        let next = isMemberAccess ? NEW_SERVER_SESSION : LOCAL_SESSION;

        if (server) {
          callbacksRef.current.onRestore(server.record, 'server');
          next = server.session;
        } else if (isDraftCreationRecord(current)) {
          callbacksRef.current.onRestore(current, 'local');
          next = resolveLocalSession(current, isMemberAccess);
        } else if (current?.stage === 'STORYLINE_GENERATION') {
          callbacksRef.current.onRestorePending(current);
          next = resolveLocalSession(current, isMemberAccess);
        }

        clearDraftResumeIntent();
        isResolvedRef.current = true;
        setIsError(false);
        setSession(next);
      } catch {
        if (active) setIsError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt, access]);

  return {
    isEntryResolved: session !== null,
    session,
    isError,
    retry: () => setAttempt((value) => value + 1),
  };
}
