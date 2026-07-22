'use client';

import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useMigrate } from '@/api/generated/endpoints/auth/auth';
import { getGetChatDetailQueryKey } from '@/api/generated/endpoints/chats/chats';
import {
  getGetMyChatsQueryKey,
  getGetMyStoriesQueryKey,
} from '@/api/generated/endpoints/users/users';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { clearGuestUsage } from '@/features/auth/_shared/utils/guest-usage-storage';
import {
  isMigrationClosedFor,
  markMigrationClosedFor,
} from '@/features/auth/_shared/utils/migration-closed-storage';
import {
  CREATED_CHAT_IDS_STORAGE_KEY,
  parseCreatedChatIds,
  writeCreatedChatIds,
} from '@/features/chats/_shared/utils/chat-id-storage';
import {
  CREATED_STORY_IDS_STORAGE_KEY,
  parseCreatedStoryIds,
  writeCreatedStoryIds,
} from '@/features/stories/_shared/utils/story-id-storage';
import { FetchError } from '@/lib/custom-fetch';

import { countMigrated } from '../utils/migration-result';
import { filterValidUuids } from '../utils/uuid';

type MigrationIds = { storyIds: string[]; chatIds: string[] };

/**
 * 로그인 직후 게스트 서재(localStorage ID 배열)를 계정으로 자동 이관한다(FE-SCREEN-008).
 * 회원 모드는 로컬에 ID를 쓰지 않으므로 "인증됨 ∧ 로컬 ID 존재"는 곧 미이관 데이터 존재와
 * 동치다 — 별도 플래그 없이 실패 후 재방문 시에도 자연 재시도된다.
 *
 * 로컬 ID는 서버가 항목을 실제로 평가한 경우에만 지운다. 이관 잠금(`migrationClosed`)
 * 응답은 어떤 항목도 평가하지 않았고 리소스는 `user_id` NULL로 살아 있는데, 서버에
 * 게스트 식별 수단이 없어 로컬 ID가 그 데이터에 도달할 유일한 손잡이다 — 지우면
 * 로그아웃 후에도 영영 찾지 못한다. 대신 계정별 닫힘 표시를 남겨 재방문마다
 * 재호출·재안내하지 않는다.
 */
export function useAutoMigration(): void {
  const { status, data: session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { mutate } = useMigrate();
  const hasStartedRef = useRef(false);
  const hasClearedUsageRef = useRef(false);

  // 인증이 확정되면 게스트 사용량 카운터를 비운다. 이관 대상 로컬 ID가 없어도(예: 스토리라인만
  // 생성한 게스트) 실행되므로, 로그인 후 스테일 카운터가 남아 다시 게스트로 게이팅되는 것을 막는다.
  useEffect(() => {
    if (status !== 'authenticated' || hasClearedUsageRef.current) {
      return;
    }

    hasClearedUsageRef.current = true;
    clearGuestUsage();
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated' || hasStartedRef.current) {
      return;
    }

    const storyIds = parseCreatedStoryIds(
      window.localStorage.getItem(CREATED_STORY_IDS_STORAGE_KEY),
    );
    const chatIds = parseCreatedChatIds(
      window.localStorage.getItem(CREATED_CHAT_IDS_STORAGE_KEY),
    );

    if (storyIds.length === 0 && chatIds.length === 0) {
      return;
    }

    // 이 계정은 이관이 닫힘으로 이미 확인·안내됐다. 결과가 같은 재호출을 만들지 않는다.
    if (userId && isMigrationClosedFor(userId)) {
      return;
    }

    hasStartedRef.current = true;

    const submit = (ids: MigrationIds, isRetry: boolean) => {
      mutate(
        { data: ids },
        {
          onSuccess: (response) => {
            if (response.status !== 200) {
              return;
            }

            // 계정당 1회 제한(migrated_at)에 걸려 어떤 항목도 평가되지 않은 응답이다.
            // 리소스는 NULL 소유로 살아 있으므로 로컬 ID를 유지해 로그아웃 시 게스트
            // 서재로 돌아갈 수 있게 하고, 계정별 닫힘 표시로 재호출·재안내를 막은 뒤
            // 사유를 알린다(소유권이 그대로라 재조회할 것도 없다).
            if (response.data.migrationClosed) {
              if (userId) {
                markMigrationClosedFor(userId);
              }

              toast(TOAST_MESSAGE.MIGRATION_ALREADY_DONE);

              return;
            }

            // 서버가 항목을 실제로 평가한 응답(MIGRATED·ALREADY_OWNED·CONFLICT·NOT_FOUND)
            // 이므로 제출한 ID를 로컬에서 제거한다 — 회원 서재는 서버가 정본이고,
            // CONFLICT·NOT_FOUND는 게스트로도 접근 불가라 남길 가치가 없다.
            writeCreatedStoryIds([]);
            writeCreatedChatIds([]);

            // 이관된 항목이 이미 마운트된 목록 화면에 바로 보이도록 회원 목록을 새로 조회한다.
            void queryClient.invalidateQueries({
              queryKey: getGetMyStoriesQueryKey(),
            });
            void queryClient.invalidateQueries({
              queryKey: getGetMyChatsQueryKey(),
            });
            // 이관으로 채팅 소유권이 게스트→계정으로 바뀌므로, 로그인 직후 곧바로
            // 열려 있던 채팅방(상세 조회가 이관과 경쟁해 소유권 403으로 실패한 상태)이
            // 남지 않도록 각 채팅 상세 쿼리를 다시 조회시킨다.
            //
            // invalidate가 아니라 reset인 이유: 아직 응답을 못 받은 조회에는 invalidate가
            // 흡수된다. React Query는 한 번도 성공한 적 없는 쿼리(dataUpdatedAt === 0)를
            // refetch할 때 진행 중인 요청을 그대로 재사용하므로, 이관 전에 도착해 403으로
            // 확정된 응답이 그대로 굳는다. reset은 진행 중 요청을 취소하고 초기 상태로
            // 되돌린 뒤 새로 조회해 이 경쟁을 없앤다.
            ids.chatIds.forEach((chatId) => {
              void queryClient.resetQueries({
                queryKey: getGetChatDetailQueryKey(chatId),
              });
            });

            const { storyCount, chatCount } = countMigrated(response.data);

            if (storyCount + chatCount > 0) {
              toast.success(
                TOAST_MESSAGE.MIGRATION_SUCCEEDED(storyCount, chatCount),
              );
            }
          },
          onError: (error) => {
            // 400은 손상 ID가 섞인 경우 — 유효한 UUID만 1회 재제출하고 형식 불량 ID는 폐기해
            // 매 진입 반복 실패를 막는다. 네트워크 등 그 외 실패는 다음 방문 시 자연 재시도.
            if (
              isRetry ||
              !(error instanceof FetchError) ||
              error.status !== 400
            ) {
              return;
            }

            const validIds: MigrationIds = {
              storyIds: filterValidUuids(ids.storyIds),
              chatIds: filterValidUuids(ids.chatIds),
            };

            writeCreatedStoryIds(validIds.storyIds);
            writeCreatedChatIds(validIds.chatIds);

            if (
              validIds.storyIds.length === 0 &&
              validIds.chatIds.length === 0
            ) {
              return;
            }

            submit(validIds, true);
          },
        },
      );
    };

    submit({ storyIds, chatIds }, false);
  }, [status, userId, mutate, queryClient]);
}
