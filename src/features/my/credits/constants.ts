import { SITE_CONTACT_EMAIL } from '@/constants/site';

/** 이프 충전 화면(탭 셸·무료 충전 탭)의 사용자 문구 정본. E2E와 문서는 리터럴 대신 이 상수를 참조한다. */
export const CREDIT_CHARGE_COPY = {
  title: '이프 충전',
  entryButton: '충전',
  historyButton: '내역',
  balanceLabel: '내 이프',
  purchaseTab: '구매',
  freeChargeTab: '무료 충전',
  historyTab: '내역',
  attendanceButton: '출석 하기',
  attendanceDoneButton: '출석 완료',
  attendanceClaiming: '출석 체크 중',
  attendanceNotes: [
    '매일 오전 00시에 초기화돼요',
    '보상으로 받은 이프는 적립일로부터 30일 동안 사용할 수 있어요',
  ],
} as const;

/**
 * 출석 상자의 두 줄 제목을 만든다. 보상 금액은 서버 정책값이라 문자열로 받는다.
 *
 * @param amount 하루 한 번 출석으로 받는 이프의 표시 문자열
 * @returns 제목 두 줄
 */
export const buildAttendanceTitleLines = (amount: string) =>
  ['매일 출석하고', `매일 ${amount} 이프 받으세요`] as const;

/** 이프 충전의 구매 탭 문구 정본. */
export const CREDIT_PURCHASE_COPY = {
  productListLabel: '충전 상품',
  loading: '충전 상품을 불러오는 중',
  loadFailed: '충전 상품을 불러오지 못했어요',
  retry: '다시 시도하기',
  retrying: '다시 시도 중...',
  ordering: '결제 준비 중',
} as const;

/**
 * 구매 탭 상품 목록 아래의 안내 문구 정본. 이용약관 제8조와 제8조의2가 구매 전 화면에 알리기로 한
 * 청약철회 제한, 미성년자 취소와 사용 기간을 담는다. 약관을 바꾸면 이 문구도 함께 맞춘다.
 */
export const CREDIT_PURCHASE_NOTICE = {
  title: '환불과 이프 이용 안내',
  items: [
    '결제일로부터 7일 안에 구매한 이프를 하나도 쓰지 않았다면 전액 환불받을 수 있어요',
    '7일이 지났거나 구매한 이프를 조금이라도 썼다면 환불받을 수 없어요',
    '만 19세 미만이 법정대리인 동의 없이 결제했다면 본인이나 법정대리인이 취소할 수 있어요',
    '구매한 이프는 적립일로부터 5년, 무료로 받은 이프는 30일 동안 쓸 수 있어요',
    '기간이 지난 이프는 사라지고 되돌릴 수 없어요',
    '만료일이 가까운 이프부터 먼저 써요',
    '탈퇴하면 남은 이프는 사라져요',
    `환불과 취소는 ${SITE_CONTACT_EMAIL}으로 요청해 주세요`,
  ],
} as const;

/**
 * 상품 줄의 기본 이프 라벨을 만든다.
 *
 * @param baseCredits 보너스를 뺀 기본 이프
 * @returns `1,000 이프` 형태의 라벨
 */
export const buildCreditProductLabel = (baseCredits: number) =>
  `${baseCredits.toLocaleString('ko-KR')} 이프`;

/**
 * 보너스가 있는 상품의 보조 문구를 만든다.
 *
 * @param bonusCredits 보너스 이프
 * @returns `+100 이프` 형태의 문구
 */
export const buildCreditBonusLabel = (bonusCredits: number) =>
  `+${bonusCredits.toLocaleString('ko-KR')} 이프`;

/**
 * 결제 버튼의 원화 가격 라벨을 만든다.
 *
 * @param priceKrw 원화 가격
 * @returns `10,000원` 형태의 라벨
 */
export const formatKrwPrice = (priceKrw: number) =>
  `${priceKrw.toLocaleString('ko-KR')}원`;

/** 결제창에서 돌아온 뒤 주문 확인 카드의 문구 정본. */
export const CREDIT_ORDER_COPY = {
  title: '결제 확인',
  checking: '결제를 확인하고 있어요',
  checkingHint: '잠시만 기다려 주세요',
  completed: (amount: string) => `${amount} 이프가 충전됐어요`,
  refunded: '환불된 주문이에요',
  notFound: '확인할 수 없는 주문이에요',
  timeout: '아직 결제 확인이 안 됐어요',
  failed: '결제 확인에 실패했어요',
  retryHint: '결제를 마쳤다면 잠시 후 다시 확인해 주세요',
  retry: '다시 확인',
  dismiss: '닫기',
} as const;
