/** 온보딩 노출 판정 결과. `pending`은 아직 판정할 수 없는 상태다. */
export type OnboardingGate = 'pending' | 'eligible' | 'ineligible';

export type OnboardingGateContext = {
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
  /** 로컬스토리지에서 읽은 스토리 ID 목록. 서버 렌더링 시점에는 null */
  storyIds: readonly string[] | null;
  /** 로컬스토리지에서 읽은 채팅 ID 목록. 서버 렌더링 시점에는 null */
  chatIds: readonly string[] | null;
  hasSeenOnboarding: boolean;
};

/**
 * 온보딩을 보여줄 신규 방문자인지 판정한다.
 *
 * 로그인 여부는 로컬스토리지보다 먼저 확정되므로 회원은 즉시 제외하고,
 * 게스트만 생성 이력·열람 여부를 확인한다. 아직 읽지 못한 값이 있으면
 * `pending`을 반환해 호출부가 화면을 확정하지 않도록 한다.
 *
 * @param context 세션 상태와 로컬스토리지 스냅샷
 * @returns 노출 대상 여부(`pending`이면 판정 보류)
 */
export function resolveOnboardingGate({
  sessionStatus,
  storyIds,
  chatIds,
  hasSeenOnboarding,
}: OnboardingGateContext): OnboardingGate {
  if (sessionStatus === 'authenticated') {
    return 'ineligible';
  }

  if (sessionStatus === 'loading' || storyIds === null || chatIds === null) {
    return 'pending';
  }

  if (hasSeenOnboarding || storyIds.length > 0 || chatIds.length > 0) {
    return 'ineligible';
  }

  return 'eligible';
}
