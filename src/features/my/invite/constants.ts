/**
 * 보상 금액이 들어가는 친구 초대 문구를 만든다. 금액은 서버 정책값이라 문자열로 받는다.
 *
 * 토스트·공유 제목처럼 자리표시·쉬머를 둘 수 없는 자리는 값이 없을 때 `undefined`를 그대로 넘긴다.
 *
 * @param amount 초대자와 제출자가 각각 받는 이프의 표시 문자열
 * @returns 초대 보상 문구 묶음
 */
export const buildInviteRewardCopy = (amount: string | undefined) =>
  ({
    pageDescription: `친구가 내 초대 코드를 등록하면 모두 ${amount} 이프를 받아요`,
    onboardingTitle: `초대 코드를 등록하면\n${amount} 이프를 받을 수 있어요`,
    redeemedToast: `친구 초대 보상으로 ${amount} 이프를 받았어요`,
    onboardingCloseFailed: `${amount} 이프는 정상 지급되었지만, 창을 닫는 데 실패했어요`,
    kakaoShareTitle: `초대 코드 등록하고 ${amount} 이프 받기 🎁`,
  }) as const;

/** 친구 초대 화면 아래의 이용 안내 문구 정본. Android 초대 화면과 같은 문구를 쓴다. */
export const INVITE_GUIDE = {
  title: '이용 안내',
  lines: [
    '초대 보상은 매월 최대 10회까지 받을 수 있으며, 매월 1일 초기화돼요. (한국 시간 기준)',
    '초대 코드는 계정당 한 번 입력할 수 있어요.',
    '보상으로 받은 이프는 적립일부터 30일 동안 사용할 수 있어요.',
    '본 이벤트는 사전 고지 없이 변경되거나 종료될 수 있어요.',
  ],
} as const;
