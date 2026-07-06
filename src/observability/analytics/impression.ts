/** 동일 항목의 노출 이벤트 재전송을 막는 기본 쿨링 시간. */
const COOLING_MS = 30_000;

/** 화면·객체·항목 ID를 조합해 노출 이벤트의 중복 판별 키를 만든다. */
export function impressionKey(input: {
  screen: string;
  object: string;
  itemId: string | number;
}): string {
  return `${input.screen}|${input.object}|${input.itemId}`;
}

/** 마지막 전송 후 쿨링 시간이 지났는지 확인해 노출 이벤트를 다시 보낼지 판별한다. */
export function shouldEmitImpression(
  lastEmittedAt: number | undefined,
  now: number,
  coolingMs: number = COOLING_MS,
): boolean {
  if (lastEmittedAt === undefined) return true;

  return now - lastEmittedAt >= coolingMs;
}
