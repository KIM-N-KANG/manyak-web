import {
  CHAT_COMPLETED_TURN_COUNT_STORAGE_KEY,
  REALTIME_IMAGE_NUDGE_TURN_COUNT,
} from '../constants';

/**
 * 로컬스토리지에 저장된 기기 누적 응답 완료 횟수를 파싱한다.
 *
 * @param value 로컬스토리지에서 읽은 값(없으면 null)
 * @returns 응답 완료 횟수. 없거나 손상됐으면 0
 */
export function parseCompletedTurnCount(value: string | null): number {
  const count = Number(value);

  return Number.isInteger(count) && count > 0 ? count : 0;
}

/**
 * 응답 완료 한 번을 더한 횟수를 구한다.
 * 안내 기준을 한 번 넘긴 뒤에는 더 세지 않아 안내가 다시 열리지 않는다.
 *
 * @param count 지금까지의 응답 완료 횟수
 * @returns 저장할 다음 횟수
 */
export function nextCompletedTurnCount(count: number): number {
  return Math.min(count + 1, REALTIME_IMAGE_NUDGE_TURN_COUNT + 1);
}

/**
 * 이번 응답 완료로 실시간 이미지 안내를 열어야 하는지 판정한다.
 * 누적 횟수가 기준에 막 닿은 순간 실시간 이미지가 꺼져 있을 때만 연다.
 *
 * @param count 이번 응답까지 센 누적 횟수
 * @param realtimeImageEnabled 실시간 이미지 설정
 * @returns 안내를 열어야 하면 true
 */
export function shouldOpenRealtimeImageNudge(
  count: number,
  realtimeImageEnabled: boolean,
): boolean {
  return count === REALTIME_IMAGE_NUDGE_TURN_COUNT && !realtimeImageEnabled;
}

/**
 * 기기 누적 응답 완료 횟수를 하나 늘려 저장한다.
 *
 * @returns 늘린 횟수. localStorage를 쓸 수 없으면 0
 */
export function recordCompletedTurn(): number {
  try {
    const next = nextCompletedTurnCount(
      parseCompletedTurnCount(
        window.localStorage.getItem(CHAT_COMPLETED_TURN_COUNT_STORAGE_KEY),
      ),
    );

    window.localStorage.setItem(
      CHAT_COMPLETED_TURN_COUNT_STORAGE_KEY,
      String(next),
    );

    return next;
  } catch {
    // 프라이빗 모드 등 localStorage 차단 환경에서는 세지 않아 안내도 열지 않는다.
    return 0;
  }
}
