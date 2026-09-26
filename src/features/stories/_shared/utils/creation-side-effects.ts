import type { QueryClient } from '@tanstack/react-query';

import { getGetTrialsQueryKey } from '@/api/generated/endpoints/trial-controller/trial-controller';
import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import { getCreationEpoch } from '@/features/stories/_shared/utils/creation-db';
import { markPendingStoryCreated } from '@/features/stories/_shared/utils/creation-request-storage';
import { saveCreatedStoryId } from '@/features/stories/_shared/utils/story-id-storage';
import { track } from '@/observability/analytics';
import { trackMetaPixelOnce } from '@/observability/marketing/pixel';

type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading';

/**
 * 스토리라인 생성 성공 부수효과(체험 잔여 재조회·Meta 픽셀)를 적용한다.
 * 원 응답·재진입 복구·제작 탭 폴링 중 결과를 선점한 한 곳에서만 호출한다.
 *
 * @param queryClient 체험 잔여 무효화에 쓰는 쿼리 클라이언트
 */
export function applyStorylinesGeneratedEffects(
  queryClient: QueryClient,
): void {
  void queryClient.invalidateQueries({ queryKey: getGetTrialsQueryKey() });

  // 스토리라인 생성 성공 = Meta 광고 퍼널 중간 신호(브라우저당 최초 1회, 재생성 제외).
  trackMetaPixelOnce('StorylinesGenerated');
}

/**
 * 스토리 완성 성공 부수효과를 적용한다. 완성 레코드에 생성 ID를 먼저 확정해
 * 새로고침·폴링이 같은 결과를 다시 적용하지 않게 하고, 회원은 내 스토리 목록을
 * 재조회하며 게스트는 서재 ID를 저장한다. 체험 잔여를 다시 조회한 뒤 분석 이벤트와
 * Meta 픽셀을 발화한다.
 *
 * @param requestId 완성 요청 ID
 * @param storyId 서버가 확정한 스토리 ID
 * @param sessionStatus 현재 세션 상태
 * @param queryClient 회원 목록 무효화에 쓰는 쿼리 클라이언트
 * @param genres 완성된 스토리의 장르 목록(분석 이벤트 프로퍼티)
 */
export async function applyStoryCompletedEffects(
  requestId: string,
  storyId: string,
  sessionStatus: SessionStatus,
  queryClient: QueryClient,
  genres?: string[],
  epoch = getCreationEpoch(),
): Promise<void> {
  if (
    !(await markPendingStoryCreated(requestId, storyId, epoch)) ||
    getCreationEpoch() !== epoch
  )
    return;

  // 게스트로 확정됐을 때만 로컬 서재에 ID를 남긴다. 제작 탭 폴링은 세션 판정을 기다리지
  // 않아 `loading` 중에도 완성이 도착할 수 있는데, 이를 게스트로 취급하면 회원의 스토리
  // ID가 로컬에 남아 로그아웃 뒤 게스트 서재에 노출된다. `loading` 중 회원 목록 무효화는
  // 쿼리가 꺼져 있어 무해하다.
  if (sessionStatus === 'unauthenticated') {
    saveCreatedStoryId(storyId);
  } else {
    void queryClient.invalidateQueries({
      queryKey: getGetMyStoriesQueryKey(),
    });
  }

  void queryClient.invalidateQueries({ queryKey: getGetTrialsQueryKey() });

  // 완성은 채팅 생성과 분리돼 있어 chat_id 없이 스토리 완성 시점에 발화한다.
  track('client_storyCreate_completed', { story_id: storyId, genres });

  // 최종 스토리 컴파일 성공 = Meta 광고 퍼널 중간 신호(브라우저당 최초 1회).
  trackMetaPixelOnce('StoryCompiled');
}
