import type { QueryClient } from '@tanstack/react-query';

import { getGetTrialsQueryKey } from '@/api/generated/endpoints/trial-controller/trial-controller';
import { getGetMyStoriesQueryKey } from '@/api/generated/endpoints/users/users';
import { markPendingStoryCreated } from '@/features/stories/_shared/utils/creation-request-storage';
import { saveCreatedStoryId } from '@/features/stories/_shared/utils/story-id-storage';
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
 * 재조회하며 게스트는 서재 ID를 저장한다. 체험 잔여를 다시 조회한 뒤 Meta 픽셀을 발화한다.
 *
 * @param requestId 완성 요청 ID
 * @param storyId 서버가 확정한 스토리 ID
 * @param sessionStatus 현재 세션 상태
 * @param queryClient 회원 목록 무효화에 쓰는 쿼리 클라이언트
 */
export function applyStoryCompletedEffects(
  requestId: string,
  storyId: string,
  sessionStatus: SessionStatus,
  queryClient: QueryClient,
): void {
  markPendingStoryCreated(requestId, storyId);

  if (sessionStatus === 'authenticated') {
    void queryClient.invalidateQueries({
      queryKey: getGetMyStoriesQueryKey(),
    });
  } else {
    saveCreatedStoryId(storyId);
  }

  void queryClient.invalidateQueries({ queryKey: getGetTrialsQueryKey() });

  // 최종 스토리 컴파일 성공 = Meta 광고 퍼널 중간 신호(브라우저당 최초 1회).
  trackMetaPixelOnce('StoryCompiled');
}
