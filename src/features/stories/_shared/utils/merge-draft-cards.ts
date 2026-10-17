import {
  type PendingCreationRequest,
  sortByCreatedAtDesc,
  type StoryCompletionRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import type { StoryDraftCard } from '@/features/stories/_shared/utils/story-draft-response';

/**
 * 제작 탭 초안 묶음의 항목이다. 기기 안 레코드와 서버 초안을 같은 줄에 놓는다. 기기 안 항목의
 * `hiddenServerDraftId`는 그 기록에 가려 숨긴 같은 제작의 서버 초안이며, 카드를 지울 때 함께 지운다.
 */
export type DraftListItem =
  | {
      source: 'local';
      record: PendingCreationRequest;
      hiddenServerDraftId?: string;
    }
  | { source: 'server'; card: StoryDraftCard };

/**
 * 기기 안 기록이 서버 카드를 가리는지 반환한다. 기록을 만든 뒤 서버 초안이 다시 저장됐으면(다른 기기의 저장)
 * 서버 카드가 더 새로우므로 가리지 않는다.
 *
 * @param record 기기 안 기록
 * @param card 서버 초안 카드
 * @returns 같은 제작이고 서버 카드가 기록보다 새롭지 않으면 참
 */
const hides = (
  record: PendingCreationRequest | StoryCompletionRecord,
  card: StoryDraftCard,
) =>
  'draftId' in record &&
  record.draftId === card.draftId &&
  card.version <= (record.draftVersion ?? 0);

/**
 * 기기 안 초안과 서버 초안을 한 목록으로 합친다. 기기 안 진행 기록(생성 중, 생성 결과, 완성 중, 완성 실패)이
 * 서버 초안을 가리키고 그 뒤로 서버 초안이 저장되지 않았으면 같은 제작의 오래된 서버 초안이므로 서버 카드를 숨긴다.
 * 연결 없이 같은 ID가 양쪽에 있으면 서버 초안만 남기고(이관 뒤 로컬 삭제가 늦은 경우), 처음 저장 시각 최신순으로
 * 정렬한다. 시각이 없는 구 레코드는 원래 순서대로 맨 뒤에 둔다.
 *
 * @param local 기기 안 편집 초안 레코드
 * @param server 서버 초안 카드
 * @param completions 기기 안 완성 기록. 가리키는 서버 초안을 숨기는 데만 쓴다
 * @returns 정렬된 초안 목록
 */
export function mergeDraftCards(
  local: PendingCreationRequest[],
  server: StoryDraftCard[],
  completions: StoryCompletionRecord[] = [],
): DraftListItem[] {
  const links = [...local, ...completions];
  const visible = server.filter(
    (card) => !links.some((record) => hides(record, card)),
  );
  const serverIds = new Set(visible.map((card) => card.draftId));
  const items = [
    ...visible.map((card) => ({
      item: { source: 'server', card } as const,
      createdAt: card.createdAt,
    })),
    ...local
      .filter((record) => !serverIds.has(record.requestId))
      .map((record) => {
        const hidden = server.find((card) => hides(record, card));

        return {
          item: {
            source: 'local',
            record,
            ...(hidden && { hiddenServerDraftId: hidden.draftId }),
          } as const,
          createdAt: record.createdAt,
        };
      }),
  ];

  return sortByCreatedAtDesc(items).map(({ item }) => item);
}
