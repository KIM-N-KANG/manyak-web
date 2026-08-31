import { CREDIT_POLICY } from '@/constants/credit';

export const INVITE_REWARD_AMOUNT = CREDIT_POLICY.inviteReward;

const inviteRewardAmountText = INVITE_REWARD_AMOUNT.toLocaleString('ko-KR');

export const INVITE_REWARD_COPY = {
  pageDescription: `친구가 내 초대 코드를 등록하면 모두 ${inviteRewardAmountText} 이프를 받아요`,
  onboardingTitle: `초대 코드를 등록하면\n${inviteRewardAmountText} 이프를 받을 수 있어요`,
  redeemedToast: `친구 초대 보상으로 ${inviteRewardAmountText} 이프를 받았어요`,
  onboardingCloseFailed: `${inviteRewardAmountText} 이프는 정상 지급되었지만, 창을 닫는 데 실패했어요`,
  kakaoShareTitle: `초대 코드 등록하고 ${inviteRewardAmountText} 이프 받기 🎁`,
} as const;
