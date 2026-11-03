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
  note: '구매한 이프는 적립일로부터 5년 동안 사용할 수 있어요',
  loading: '충전 상품을 불러오는 중',
  loadFailed: '충전 상품을 불러오지 못했어요',
  retry: '다시 시도하기',
  retrying: '다시 시도 중...',
  ordering: '결제 준비 중',
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
