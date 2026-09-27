import {
  GENERAL_STORY_TEXT_FIELDS,
  type GeneralStoryTextField,
} from '@/features/studio/general/constants';

/**
 * 글 항목의 클라이언트 전용 최소 글자 수 오류 문구를 반환한다. 앞뒤 공백을 빼고 코드 포인트로 세며,
 * 비어 있으면 필수 검사가 맡으므로 오류로 보지 않는다.
 */
export function getGeneralStoryTextError(
  field: GeneralStoryTextField,
  value: string,
): string | null {
  const config = GENERAL_STORY_TEXT_FIELDS[field];

  if (!('minLength' in config)) {
    return null;
  }

  const length = [...value.trim()].length;

  return length > 0 && length < config.minLength ? config.minLengthError : null;
}
