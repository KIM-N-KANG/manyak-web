import { CREDIT_POLICY } from '@/constants/credit';

const inviteRewardText = CREDIT_POLICY.inviteReward.toLocaleString('ko-KR');

/**
 * 마이와 이프 충전이 함께 쓰는 친구 초대 진입 메뉴의 문구 정본.
 * 라벨과 보조 문구는 "친구 초대 + 하고 N 이프 받기"로 이어 읽힌다.
 */
export const INVITE_MENU_COPY = {
  label: '친구 초대',
  subLabel: `하고 ${inviteRewardText} 이프 받기`,
} as const;
