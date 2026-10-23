import { GENERAL_STORY_MIN_LENGTH } from '@/features/studio/general/constants';
import { hasFinalConsonant } from '@/lib/korean';

/**
 * 빈 필수 칸의 오류 문구를 반환한다.
 *
 * @param label 오류 문구 앞에 넣을 칸 이름
 * @returns "{칸 이름}을(를) 입력해 주세요"
 */
export function getRequiredError(label: string) {
  return `${label}${hasFinalConsonant(label) ? '을' : '를'} 입력해 주세요`;
}

/**
 * 글 입력의 클라이언트 전용 최소 글자 수 오류 문구를 반환한다. 앞뒤 공백을 빼고 코드 포인트로 세며,
 * 비어 있으면 필수 검사가 맡으므로 오류로 보지 않는다.
 *
 * @param label 오류 문구 앞에 넣을 칸 이름
 * @param value 검사할 입력값
 * @returns 최소 글자 수보다 짧으면 오류 문구, 아니면 null
 */
export function getMinLengthError(label: string, value: string) {
  const length = [...value.trim()].length;

  if (length === 0 || length >= GENERAL_STORY_MIN_LENGTH) {
    return null;
  }

  return `${label}${hasFinalConsonant(label) ? '은' : '는'} ${GENERAL_STORY_MIN_LENGTH}자 이상 입력해 주세요`;
}
