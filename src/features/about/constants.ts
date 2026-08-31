import { CREDIT_POLICY } from '@/constants/credit';

export const SERVICE_INFO_TITLE = '서비스 안내';

/**
 * 이프 금액에 한국어 천 단위 구분자를 적용한다.
 *
 * @param amount 표시할 이프 금액이다.
 * @returns 천 단위 구분자가 적용된 문자열이다.
 */
const formatCredit = (amount: number) => amount.toLocaleString('ko-KR');

export const SERVICE_INFO_CREDIT_ITEMS = [
  `스토리를 완성할 때 ${formatCredit(CREDIT_POLICY.storyCompletion)}이프가 차감돼요.`,
  `채팅을 한 번 보내거나 다시 생성할 때마다 ${formatCredit(CREDIT_POLICY.chatTurn)}이프가 차감돼요.`,
  '스토리라인 생성은 이프가 들지 않아요.',
  `회원가입하면 ${formatCredit(CREDIT_POLICY.signupReward)}이프를 받아요.`,
  `출석 체크로 매일 ${formatCredit(CREDIT_POLICY.attendanceReward)}이프를 받을 수 있어요. 출시 이벤트 기간에는 한시적으로 ${formatCredit(CREDIT_POLICY.launchAttendanceReward)}이프를 받아요.`,
  `친구 초대는 초대한 사람과 코드를 입력한 사람 모두 ${formatCredit(CREDIT_POLICY.inviteReward)}이프를 받아요.`,
  '보상으로 받은 이프는 적립일부터 30일 동안 사용할 수 있어요.',
] as const;
