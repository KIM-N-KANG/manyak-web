import { getUsersMeStoryDrafts } from '@/api/generated/endpoints/story-draft-controller/story-draft-controller';
import {
  loadPendingCreationRequests,
  loadStoryCompletionRequests,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { mergeDraftCards } from '@/features/stories/_shared/utils/merge-draft-cards';
import { readStoryDraftCards } from '@/features/stories/_shared/utils/story-draft-response';

/**
 * 회원이 제작 탭에 둘 수 있는 만들고 있는 스토리 카드 수다. 서버 초안 상한(회원당 5개)과 같다. 서버 초안 하나는 카드
 * 많아야 한 장이므로 카드가 이 수보다 적으면 새 제작의 첫 저장에 서버 자리가 있다.
 */
export const DRAFT_CARD_LIMIT = 5;

/**
 * 회원의 만들고 있는 스토리 카드가 가득 찼는지 확인한다. 제작 탭과 같이 서버 초안과 기기 안 기록을 합쳐 센다.
 * 서버 목록을 불러오지 못하면 제작 탭처럼 기기 안 기록만 세고, 기기 안 기록을 읽지 못하면 막지 않는다.
 *
 * @returns 카드가 상한 이상이면 참
 */
export async function isDraftCardLimitReached(): Promise<boolean> {
  try {
    const [pending, completions, server] = await Promise.all([
      loadPendingCreationRequests(),
      loadStoryCompletionRequests(),
      getUsersMeStoryDrafts().then(
        (response) =>
          readStoryDraftCards(response.status === 200 ? response.data : []),
        () => [],
      ),
    ]);

    return (
      mergeDraftCards(pending, server, completions).length >= DRAFT_CARD_LIMIT
    );
  } catch {
    return false;
  }
}
