import type { CreditTransactionResponseReason } from '@/api/generated/models';

/** 이프 내역 화면의 사용자 문구 정본. E2E와 문서는 리터럴 대신 이 상수를 참조한다. */
export const CREDIT_HISTORY_COPY = {
  title: '이프 내역',
  entryButton: '내역',
  balanceLabel: '내 이프',
  empty: '아직 이프 내역이 없어요',
  loadFailed: '이프 내역을 불러오지 못했어요',
  retry: '다시 시도하기',
  retrying: '다시 시도 중...',
  deletedStory: '삭제된 스토리',
  loading: '이프 내역을 불러오는 중',
} as const;

/**
 * 원장 사유의 한국어 라벨. 서버는 enum 원문만 내려주므로 문구는 클라이언트가 붙인다 —
 * 문구를 바꾸는 데 서버 배포를 걸지 않기 위해서다.
 */
export const CREDIT_REASON_LABEL: Partial<
  Record<CreditTransactionResponseReason, string>
> = {
  SIGNUP_REWARD: '가입 보상',
  ATTENDANCE_REWARD: '출석 체크 보상',
  INVITE_REWARD: '친구 초대 보상',
  REFUND: '사용 취소',
  STORY_CREATION: '스토리 완성',
  CHAT_TURN: '채팅 전송',
  EXPIRE: '기간 만료',
};

/** 서버가 사유를 늘려도 그 줄만 일반 문구로 그리기 위한 기본 라벨이다. */
export const CREDIT_REASON_FALLBACK_LABEL = '이프 변동';
