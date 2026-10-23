import { CHAT_TRIAL_MODEL_CODE } from '../constants';

type ChatTurnCostInput = {
  /** 고른 채팅 모델의 턴 이프 비용(조회 전이면 undefined) */
  turnCost: number | undefined;
  /** 고른 채팅 모델 코드. 턴 체험은 체험 모델일 때만 적용된다 */
  modelCode: string | undefined;
  /** 서버 정책의 실시간 이미지 이프 비용(조회 전이면 undefined) */
  chatImageCost: number | undefined;
  /** 실시간 이미지가 켜져 있어 이미지 비용을 합산할지 여부 */
  withRealtimeImage: boolean;
  /** 채팅 턴 체험 잔여(응답 전 undefined, 무제한 null) */
  turnRemaining: number | null | undefined;
  /** 실시간 이미지 체험 잔여(응답 전 undefined, 무제한 null) */
  imageRemaining: number | null | undefined;
};

export type ChatTurnCost = {
  /** 체험 없이 낼 정가. 필요한 정책값을 못 받았으면 undefined */
  full: number | undefined;
  /** 남은 체험을 적용한 실제 비용. 정가나 잔여를 못 받았으면 undefined */
  discounted: number | undefined;
};

/**
 * 체험이 남아 있어 해당 항목이 무료인지 판정한다. 무제한(null)도 무료로 본다.
 *
 * @param remaining 체험 잔여
 * @returns 무료면 true. 응답 전(undefined)은 false
 */
export const isTrialFree = (remaining: number | null | undefined) =>
  remaining === null || (typeof remaining === 'number' && remaining > 0);

/**
 * 고른 모델에 적용되는 턴 체험 잔여를 구한다. 턴 체험은 체험 모델로만 답하므로 다른 모델은 0으로 본다.
 *
 * @param remaining 채팅 턴 체험 잔여
 * @param modelCode 고른 채팅 모델 코드
 * @returns 이 모델에 적용되는 체험 잔여
 */
export const getModelTurnRemaining = (
  remaining: number | null | undefined,
  modelCode: string | undefined,
) => (modelCode === CHAT_TRIAL_MODEL_CODE ? remaining : 0);

/**
 * 채팅 턴 정가와 체험 적용가를 계산한다.
 * 실시간 이미지를 합산할 때만 이미지 정책값·잔여를 요구한다.
 *
 * @param input 정책 비용·실시간 이미지 여부·체험 잔여
 * @returns 정가와 체험 적용가
 */
export function calcChatTurnCost({
  turnCost,
  modelCode,
  chatImageCost,
  withRealtimeImage,
  turnRemaining: totalTurnRemaining,
  imageRemaining,
}: ChatTurnCostInput): ChatTurnCost {
  const turnRemaining = getModelTurnRemaining(totalTurnRemaining, modelCode);
  const imageCost = withRealtimeImage ? chatImageCost : 0;
  const imageKnown = !withRealtimeImage || imageRemaining !== undefined;

  if (turnCost === undefined || imageCost === undefined) {
    return { full: undefined, discounted: undefined };
  }

  const full = turnCost + imageCost;

  if (turnRemaining === undefined || !imageKnown) {
    return { full, discounted: undefined };
  }

  return {
    full,
    discounted:
      (isTrialFree(turnRemaining) ? 0 : turnCost) +
      (isTrialFree(imageRemaining) ? 0 : imageCost),
  };
}
