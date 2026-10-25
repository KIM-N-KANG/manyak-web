type StoryCreationCreditInput = {
  /** 프로필(`GET /auth/me`)의 이프 잔액. 아직 모르면 undefined */
  balance: number | undefined;
  /** 정책(`GET /credits/policies`)의 스토리 완성 비용. 아직 모르면 undefined */
  cost: number | undefined;
  /** 스토리 제작 체험 잔여. 응답 전이면 undefined, 무제한이면 null */
  trialRemaining: number | null | undefined;
};

/**
 * 아는 잔액이 스토리 완성 비용에 못 미치는지 판정한다. 잔액, 정책, 체험 중 하나라도 모르거나 체험이 남았으면
 * 막지 않는다. 판단은 서버(402) 몫이고, 여기서 막는 것은 확실히 모자랄 때 제작 탭으로 떠나지 않게 하는 것뿐이다.
 *
 * @param input 잔액, 완성 비용, 체험 잔여
 * @returns 확실히 모자라면 true
 */
export function isStoryCreationCreditShort({
  balance,
  cost,
  trialRemaining,
}: StoryCreationCreditInput): boolean {
  if (
    balance === undefined ||
    cost === undefined ||
    trialRemaining === undefined
  ) {
    return false;
  }

  if (trialRemaining === null || trialRemaining > 0) return false;

  return balance < cost;
}
