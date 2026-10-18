'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { getUsersMeStoryDraftsByDraftId } from '@/api/generated/endpoints/story-draft-controller/story-draft-controller';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  findPendingCreationRequest,
  type GeneralDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { isDraftCardLimitReached } from '@/features/stories/_shared/utils/draft-card-limit';
import {
  clearDraftResumeIntent,
  peekDraftResumeIntent,
} from '@/features/stories/_shared/utils/draft-resume-intent';
import { readStoryDraftDetail } from '@/features/stories/_shared/utils/story-draft-response';
import {
  GENERAL_DRAFT_SCHEMA_VERSION,
  readGeneralDraftPayload,
} from '@/features/studio/_shared/utils/general-draft-payload';
import type { GeneralStoryDraftSnapshot } from '@/features/studio/_shared/utils/general-story-draft';
import { FetchError } from '@/lib/api-error';
import { returnToMainTab } from '@/lib/return-to-main-tab';

/** 일반 제작 진입 판정이다. 새로 만들기, 기기 안 레거시 저장본, 서버 저장본 중 하나다. */
export type GeneralDraftEntry =
  | { source: 'new' }
  | { source: 'local'; record: GeneralDraftRecord }
  | {
      source: 'server';
      draftId: string;
      version: number;
      snapshot: GeneralStoryDraftSnapshot;
      imageUrls: Record<string, string>;
    };

/**
 * 재개 의도가 가리키는 일반 제작 저장본을 찾는다. 기기 안 레거시 저장본을 먼저 보고, 없으면 서버 저장본을 조회한다.
 *
 * @param draftId 재개 의도에 남은 저장본 ID
 * @returns 진입 판정. 서버에서 찾지 못하면(다른 곳에서 등록하거나 지움) 안내한 뒤 새로 만든다
 * @throws 서버 조회가 404 밖의 이유로 실패하거나 응답을 읽지 못한 경우
 */
async function resolveDraftEntry(draftId: string): Promise<GeneralDraftEntry> {
  const record = await findPendingCreationRequest(draftId);

  if (record?.stage === 'GENERAL_DRAFT') return { source: 'local', record };

  try {
    const response = await getUsersMeStoryDraftsByDraftId(draftId);
    const detail = readStoryDraftDetail(response.data);

    // 모르는 스키마 버전을 읽어 다시 저장하면 그 버전에만 있는 필드를 지우므로 열지 않는다.
    if (
      !detail ||
      detail.mode !== 'GENERAL' ||
      detail.schemaVersion !== GENERAL_DRAFT_SCHEMA_VERSION
    )
      throw new Error('Unreadable general story draft');

    return {
      source: 'server',
      draftId: detail.draftId,
      version: detail.version,
      snapshot: readGeneralDraftPayload(detail.payload),
      imageUrls: detail.imageUrls,
    };
  } catch (error) {
    if (!(error instanceof FetchError) || error.status !== 404) throw error;

    toast.error(TOAST_MESSAGE.STORY_DRAFT_NOT_FOUND);

    return { source: 'new' };
  }
}

/**
 * 일반 제작 진입 때 재개 의도(제작 탭 카드의 "이어서 만들기")가 가리키는 임시 저장본을 불러오는 훅.
 * 의도가 없거나 일반 제작 저장본이 아니면 새로 만들고, 만들고 있는 스토리 카드가 가득 찼으면 안내한 뒤 제작 탭으로 보낸다.
 *
 * @returns 진입 판정 결과(`entry`가 없으면 조회 중), 조회 실패 여부와 재시도 함수
 */
export function useGeneralStoryDraftEntry() {
  const router = useRouter();
  const [entry, setEntry] = useState<GeneralDraftEntry | null>(null);
  const [isError, setIsError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const draftId = peekDraftResumeIntent();
        const resolved: GeneralDraftEntry =
          draftId === null
            ? { source: 'new' }
            : await resolveDraftEntry(draftId);
        // 일반 제작은 회원 전용이다. 새로 만들 때 만들고 있는 스토리 카드가 가득 찼으면 열지 않는다.
        const isLimitReached =
          resolved.source === 'new' && (await isDraftCardLimitReached());

        if (!active) return;

        clearDraftResumeIntent();

        if (isLimitReached) {
          toast.error(TOAST_MESSAGE.STORY_DRAFT_CARD_LIMIT_REACHED);
          returnToMainTab(router, APP_PATH.MAIN.STUDIO);

          return;
        }

        setIsError(false);
        setEntry(resolved);
      } catch {
        if (active) setIsError(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt, router]);

  return {
    entry,
    isError,
    retry: () => setAttempt((value) => value + 1),
  };
}
