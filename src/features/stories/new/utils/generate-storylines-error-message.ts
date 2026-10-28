import { TOAST_MESSAGE } from '@/constants/toast-message';

type GenerateStorylinesErrorMessageInput = {
  isRegeneration: boolean;
  isContentRejected?: boolean;
};

/**
 * 스토리라인 생성 실패 안내 문구를 결정한다.
 * AI가 입력 내용을 거절했으면 입력 수정 안내를 우선하고, 그 밖에는 재생성 여부(보여줄 이전 결과가
 * 남아 있는지)에 따라 첫 생성 실패와 재생성 실패 문구를 구분한다.
 *
 * @param input 재생성 여부와 입력 내용 거절 여부.
 * @returns 실패 상황에 맞는 안내 문구.
 */
export function getGenerateStorylinesErrorMessage({
  isRegeneration,
  isContentRejected = false,
}: GenerateStorylinesErrorMessageInput) {
  if (isContentRejected) {
    return TOAST_MESSAGE.STORY_CONTENT_REJECTED;
  }

  if (isRegeneration) {
    return '스토리라인을 다시 만들지 못했어요';
  }

  return '스토리라인을 만들지 못했어요';
}
