'use client';

import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useMigrate } from '@/api/generated/endpoints/auth/auth';
import {
  getGetMyChatsQueryKey,
  getGetMyStoriesQueryKey,
} from '@/api/generated/endpoints/users/users';
import {
  CREATED_CHAT_IDS_STORAGE_KEY,
  parseCreatedChatIds,
  writeCreatedChatIds,
} from '@/features/chats/list/utils/chat-id-storage';
import {
  CREATED_STORY_IDS_STORAGE_KEY,
  parseCreatedStoryIds,
  writeCreatedStoryIds,
} from '@/features/stories/list/utils/story-id-storage';
import { FetchError } from '@/lib/custom-fetch';

import { countMigrated } from '../utils/migration-result';
import { filterValidUuids } from '../utils/uuid';

type MigrationIds = { storyIds: string[]; chatIds: string[] };

/**
 * 로그인 직후 게스트 서재(localStorage ID 배열)를 계정으로 자동 이관한다(FE-SCREEN-008).
 * 회원 모드는 로컬에 ID를 쓰지 않으므로 "인증됨 ∧ 로컬 ID 존재"는 곧 미이관 데이터 존재와
 * 동치다 — 별도 플래그 없이 실패 후 재방문 시에도 자연 재시도된다.
 */
export function useAutoMigration(): void {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const { mutate } = useMigrate();
  const hasStartedRef = useRef(false);

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

    hasStartedRef.current = true;

    const submit = (ids: MigrationIds, isRetry: boolean) => {
      mutate(
        { data: ids },
        {
          onSuccess: (response) => {
            // 결과 status와 무관하게 제출한 ID는 로컬에서 제거한다 — 회원 서재는 서버가 정본.
            writeCreatedStoryIds([]);
            writeCreatedChatIds([]);

            if (response.status !== 200) {
              return;
            }

            // 이관된 항목이 이미 마운트된 목록 화면에 바로 보이도록 회원 목록을 새로 조회한다.
            void queryClient.invalidateQueries({
              queryKey: getGetMyStoriesQueryKey(),
            });
            void queryClient.invalidateQueries({
              queryKey: getGetMyChatsQueryKey(),
            });

            const { storyCount, chatCount } = countMigrated(response.data);

            if (storyCount + chatCount > 0) {
              toast.success(
                `스토리 ${storyCount}개, 채팅 ${chatCount}개를 계정으로 옮겼어요`,
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
  }, [status, mutate, queryClient]);
}
