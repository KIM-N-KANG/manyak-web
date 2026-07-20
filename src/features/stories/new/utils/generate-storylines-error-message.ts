type GenerateStorylinesErrorMessageInput = {
  isGuestLimitReached: boolean;
  isRegeneration: boolean;
};

/**
 * 스토리라인 생성 실패 안내 문구를 결정한다.
 *
 * 게스트 한도 초과가 최우선이고, 그 외에는 재생성 여부(보여줄 이전 결과가
 * 남아 있는지)에 따라 첫 생성 실패와 재생성 실패 문구를 구분한다.
 *
 * @param input 게스트 한도 도달 여부와 재생성 여부.
 * @returns 실패 상황에 맞는 안내 문구.
 */
export function getGenerateStorylinesErrorMessage({
  isGuestLimitReached,
  isRegeneration,
}: GenerateStorylinesErrorMessageInput) {
  if (isGuestLimitReached) {
    return '게스트 스토리라인 생성 횟수를 모두 사용했어요';
  }

  if (isRegeneration) {
    return '스토리라인을 다시 만들지 못했어요';
  }

  return '스토리라인을 만들지 못했어요';
}
