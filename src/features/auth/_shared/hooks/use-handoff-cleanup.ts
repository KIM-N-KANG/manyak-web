'use client';

import { useEffect, useRef } from 'react';

import { toast } from 'sonner';

import { status as fetchHandoffStatus } from '@/api/generated/endpoints/auth/auth';
import { LoginHandoffStatusResponseStatus } from '@/api/generated/models';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import {
  clearPendingHandoff,
  readPendingHandoff,
} from '@/features/auth/_shared/utils/pending-handoff-storage';
import {
  getCreatedChatIdsSnapshot,
  parseCreatedChatIds,
  writeCreatedChatIds,
} from '@/features/chats/_shared/utils/chat-id-storage';
import {
  getCreatedStoryIdsSnapshot,
  parseCreatedStoryIds,
  writeCreatedStoryIds,
} from '@/features/stories/_shared/utils/story-id-storage';
import { FetchError } from '@/lib/api-error';
import { HANDOFF_CODE_HEADER } from '@/lib/auth/handoff-header';
import { detectInAppBrowser } from '@/lib/in-app-browser';

import { subtractMigratedIds } from '../utils/handoff-cleanup';

/**
 * 이관된 공개 ID만 로컬 목록에서 제거하고 이관 건수를 안내한다.
 * 핸드오프 이후 인앱에서 새로 만든 ID는 이관 목록에 없어 그대로 남는다(스펙 §3-10 흐름 8).
 *
 * @param migratedStoryIds 서버가 이관한 스토리 공개 ID
 * @param migratedChatIds 서버가 이관한 채팅 공개 ID
 */
function applyMigratedCleanup(
  migratedStoryIds: string[],
  migratedChatIds: string[],
): void {
  writeCreatedStoryIds(
    subtractMigratedIds(
      parseCreatedStoryIds(getCreatedStoryIdsSnapshot()),
      migratedStoryIds,
    ),
  );
  writeCreatedChatIds(
    subtractMigratedIds(
      parseCreatedChatIds(getCreatedChatIdsSnapshot()),
      migratedChatIds,
    ),
  );

  const storyCount = migratedStoryIds.length;
  const chatCount = migratedChatIds.length;

  if (storyCount + chatCount > 0) {
    toast.success(TOAST_MESSAGE.MIGRATION_SUCCEEDED(storyCount, chatCount));
  }
}

/**
 * 핸드오프를 더 추적할 수 없는 종료 상태 응답. 만료·소멸이라 재조회할 대상이 없다.
 */
const TERMINAL_STATUSES = new Set([404, 410]);

/**
 * 진행 중인 핸드오프의 상태를 1회 조회해 인앱 로컬 데이터를 정리한다.
 * 코드는 pending에서 읽어 X-Manyak-Handoff-Code 헤더로 싣는다(스펙 §4-3-5).
 *
 * @param code 진행 중인 핸드오프 코드 원문
 */
async function runHandoffCleanup(code: string): Promise<void> {
  let response;

  try {
    response = await fetchHandoffStatus({
      headers: { [HANDOFF_CODE_HEADER]: code },
    });
  } catch (error) {
    // customInstance는 5xx·타임아웃에서도 throw한다. 일시적 실패에 코드를 버리면 이후
    // 어떤 재방문으로도 이관 결과를 회수할 수 없으므로, 종료 상태에서만 pending을 지운다.
    if (error instanceof FetchError && TERMINAL_STATUSES.has(error.status)) {
      clearPendingHandoff();
    }

    return;
  }

  if (response.status !== 200) {
    // 2xx이지만 본문 형태를 확정할 수 없는 응답이다. 다음 확인 기회에 다시 조회한다.
    return;
  }

  const {
    status: handoffStatus,
    migratedStoryIds,
    migratedChatIds,
  } = response.data;

  if (handoffStatus === LoginHandoffStatusResponseStatus.MIGRATED) {
    applyMigratedCleanup(migratedStoryIds ?? [], migratedChatIds ?? []);
    clearPendingHandoff();

    return;
  }

  if (handoffStatus === LoginHandoffStatusResponseStatus.MIGRATION_CLOSED) {
    // 이관 잠금: 리소스는 여전히 게스트 소유라 로컬 ID를 유지하고 사유만 안내한다.
    clearPendingHandoff();
    toast.info(TOAST_MESSAGE.MIGRATION_ALREADY_DONE);

    return;
  }

  // PENDING·LANDED: 아직 외부 로그인 전이므로 pending을 유지해 다음 방문에 재확인한다.
}

/**
 * 외부 로그인을 마치고 인앱 브라우저로 돌아왔을 때 이관된 게스트 ID를 정리하는 훅.
 * 인앱 UA + 진행 중 핸드오프(readPendingHandoff)가 있을 때만 상태를 조회한다.
 * 외부 브라우저·일반 브라우저는 pending이 없으므로 조회하지 않는다(스펙 §3-10 흐름 8).
 *
 * 카카오·인스타 인앱은 외부 브라우저를 띄워도 원래 문서를 살려두는 경우가 많아, 복귀가
 * 리마운트가 아니라 visibility 변화로만 나타난다. 마운트 시 조회는 대개 로그인 이전이라
 * PENDING·LANDED만 보므로, 문서가 다시 보일 때마다 재확인해야 이관 결과를 받아낸다.
 */
export function useHandoffCleanup(): void {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!detectInAppBrowser(navigator.userAgent)) {
      return;
    }

    const checkHandoff = () => {
      if (runningRef.current) {
        return;
      }

      const pending = readPendingHandoff();

      if (!pending) {
        return;
      }

      runningRef.current = true;

      void runHandoffCleanup(pending.code).finally(() => {
        runningRef.current = false;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHandoff();
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkHandoff();
      }
    };

    checkHandoff();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);
}
