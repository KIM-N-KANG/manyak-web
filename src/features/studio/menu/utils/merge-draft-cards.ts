import {
  type PendingCreationRequest,
  sortByCreatedAtDesc,
} from '@/features/stories/_shared/utils/creation-request-storage';
import type { StoryDraftCard } from '@/features/stories/_shared/utils/story-draft-response';

/** 제작 탭 초안 묶음의 항목이다. 기기 안 레코드와 서버 초안을 같은 줄에 놓는다. */
export type DraftListItem =
  | { source: 'local'; record: PendingCreationRequest }
  | { source: 'server'; card: StoryDraftCard };

/**
 * 기기 안 초안과 서버 초안을 한 목록으로 합친다. 같은 ID는 서버 초안만 남기고(이관 뒤 로컬 삭제가 늦은 경우),
 * 처음 저장 시각 최신순으로 정렬한다. 시각이 없는 구 레코드는 원래 순서대로 맨 뒤에 둔다.
 *
 * @param local 기기 안 편집 초안 레코드
 * @param server 서버 초안 카드
 * @returns 정렬된 초안 목록
 */
export function mergeDraftCards(
  local: PendingCreationRequest[],
  server: StoryDraftCard[],
): DraftListItem[] {
  const serverIds = new Set(server.map((card) => card.draftId));
  const items = [
    ...server.map((card) => ({
      item: { source: 'server', card } as const,
      createdAt: card.createdAt,
    })),
    ...local
      .filter((record) => !serverIds.has(record.requestId))
      .map((record) => ({
        item: { source: 'local', record } as const,
        createdAt: record.createdAt,
      })),
  ];

  return sortByCreatedAtDesc(items).map(({ item }) => item);
}
