/**
 * 결제창으로 나가기 직전의 히스토리 길이를 보관하는 세션스토리지 키.
 * 히스토리가 탭 단위라 기록도 탭 단위 저장소에 둔다.
 */
export const PAYMENT_HISTORY_LENGTH_STORAGE_KEY =
  'manyak:payment-history-length';

/**
 * 결제창으로 전체 이동한다.
 * 같은 주소를 한 칸 쌓아 앞으로 항목을 잘라 낸 뒤 그 칸을 결제창으로 바꾼다. 그러면 결제 전 화면
 * 바로 다음 칸이 결제창이 되어, 기록한 길이로 복귀 화면에서 결제 전 화면까지의 거리를 셀 수 있다.
 *
 * @param paymentUrl 주문 생성 응답의 결제창 주소
 */
export function leaveForPayment(paymentUrl: string): void {
  window.history.pushState(window.history.state, '', window.location.href);

  try {
    window.sessionStorage.setItem(
      PAYMENT_HISTORY_LENGTH_STORAGE_KEY,
      String(window.history.length),
    );
  } catch {
    // 저장소가 막힌 환경에서는 되감기 없이 결제창으로만 보낸다.
  }

  window.location.replace(paymentUrl);
}

/**
 * 복귀 화면에서 결제 전 화면까지 되감을 칸 수를 구한다.
 * 기록 시점에 결제 전 화면은 `기록 길이 - 2`번째 칸이고, 복귀 화면은 마지막 칸이다.
 *
 * 복귀 화면(`/my/credits/return`)은 앱 셸 없는 정적 문서의 인라인 스크립트로 이 함수를 소스째 실행하므로
 * 함수 바깥의 값을 참조하지 않는다. 앱 셸을 띄우면 WebKit이 되감기 시작과 함께 진행 중인 요청을 끊고,
 * 그 실패로 열린 시트가 히스토리 칸을 쌓아 되감기를 깨뜨린다.
 *
 * @param raw 기록 원문
 * @param currentLength 복귀 화면의 `history.length`
 * @returns 되감을 칸 수. 기록이 없거나 상한에 닿아 믿을 수 없으면 null
 */
export function resolvePaymentRewindDistance(
  raw: string | null,
  currentLength: number,
): number | null {
  // 길이가 상한에 닿으면 브라우저가 오래된 칸을 버렸을 수 있다. Chrome·Firefox의 상한(50)이 가장 작다.
  const historyLengthLimit = 50;
  const savedLength = Number(raw);

  if (
    !raw ||
    !Number.isInteger(savedLength) ||
    savedLength < 2 ||
    currentLength >= historyLengthLimit
  ) {
    return null;
  }

  const distance = currentLength - savedLength + 1;

  // 결제창 칸이 최소 하나 끼므로 정상 복귀는 두 칸 이상이다.
  return distance >= 2 ? distance : null;
}
