'use client';

import { useEffect, useRef } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  getGetUsersMeStoryDraftsQueryKey,
  put,
  useGetUsersMeStoryDrafts,
} from '@/api/generated/endpoints/story-draft-controller/story-draft-controller';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { useCreationEpoch } from '@/features/stories/_shared/hooks/use-creation-epoch';
import {
  type GeneralDraftRecord,
  type PendingCreationRequest,
  takePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { readStoryDraftCards } from '@/features/stories/_shared/utils/story-draft-response';

import { migrateLocalGeneralDrafts } from '../utils/migrate-local-general-drafts';

/**
 * 제작 탭에 보일 회원의 서버 초안(간편 제작과 일반 제작)을 조회하는 훅. 회원만 조회한다.
 * 조회에 실패하면 서버 초안 카드만 숨기고 제작 탭의 다른 목록은 그대로 둔다.
 * 기기 안에 남은 일반 제작 임시 저장본은 화면마다 한 번 서버로 옮긴다.
 *
 * @param localRecords 기기 안 편집 초안 레코드. 조회 중이면 undefined
 * @returns 서버 초안 카드(최신순)와 첫 조회 중 여부
 */
export function useStoryDrafts(
  localRecords: PendingCreationRequest[] | undefined,
) {
  const { isMember } = useMemberAccess();
  const epoch = useCreationEpoch();
  const queryClient = useQueryClient();
  const query = useGetUsersMeStoryDrafts({ query: { enabled: isMember } });
  const hasMigratedRef = useRef(false);
  const listed = query.data?.status === 200 ? query.data.data : undefined;
  const isListed = listed !== undefined;
  const cards = readStoryDraftCards(listed);

  useEffect(() => {
    const legacy = (localRecords ?? []).filter(
      (record): record is GeneralDraftRecord =>
        record.stage === 'GENERAL_DRAFT',
    );

    if (!isMember || !isListed || legacy.length === 0 || hasMigratedRef.current)
      return;

    hasMigratedRef.current = true;
    void migrateLocalGeneralDrafts(legacy, {
      put: (draftId, body) => put(draftId, body),
      take: (requestId) => takePendingCreationRequest(requestId, epoch),
    }).then(() =>
      queryClient.invalidateQueries({
        queryKey: getGetUsersMeStoryDraftsQueryKey(),
      }),
    );
  }, [isMember, isListed, localRecords, epoch, queryClient]);

  return { cards, isLoading: isMember && query.isPending };
}
