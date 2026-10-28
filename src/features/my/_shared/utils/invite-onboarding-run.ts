'use client';

/** 이 기기에서 초대 코드 안내 대기를 처음 본 회원 ID를 남기는 localStorage 키. */
export const INVITE_ONBOARDING_SEEN_STORAGE_KEY =
  'manyak:invite-onboarding-seen';

/** 지금 탭 세션을 가입한 접속으로 기록한 회원 ID를 남기는 sessionStorage 키. 탭을 닫으면 사라진다. */
export const INVITE_ONBOARDING_SIGNUP_RUN_STORAGE_KEY =
  'manyak:invite-onboarding-signup-run';

/**
 * 신규 가입 초대 코드 안내를 지금 접속에서 미룰지 판정한다.
 * 안내 대기를 처음 본 탭 세션을 가입한 접속으로 기록해 미루고, 그 탭 세션이 끝난 뒤의 접속에서는 미루지 않는다.
 * 같은 탭의 새로고침은 같은 접속이다. 기록은 처음 한 번만 하므로 렌더 중에 여러 번 불러도 결과가 같다.
 * 저장소를 쓸 수 없으면 미루지 않는다.
 *
 * @param userId 안내 대기 중인 회원 ID
 * @returns 지금 접속에서 안내를 띄우지 않아야 하면 true
 */
export function shouldDeferInviteOnboarding(userId: string): boolean {
  try {
    if (
      window.sessionStorage.getItem(
        INVITE_ONBOARDING_SIGNUP_RUN_STORAGE_KEY,
      ) === userId
    ) {
      return true;
    }

    if (
      window.localStorage.getItem(INVITE_ONBOARDING_SEEN_STORAGE_KEY) === userId
    ) {
      return false;
    }

    window.localStorage.setItem(INVITE_ONBOARDING_SEEN_STORAGE_KEY, userId);
    window.sessionStorage.setItem(
      INVITE_ONBOARDING_SIGNUP_RUN_STORAGE_KEY,
      userId,
    );

    return true;
  } catch {
    return false;
  }
}
