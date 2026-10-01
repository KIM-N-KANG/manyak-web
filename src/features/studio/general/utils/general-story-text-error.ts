import { GENERAL_STORY_MIN_LENGTH } from '@/features/studio/general/constants';

const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_COUNT = 11172;
const HANGUL_FINAL_CONSONANT_COUNT = 28;

/**
 * 낱말이 받침으로 끝나는지 반환한다. 한글 음절로 끝나지 않으면 받침이 없는 것으로 본다.
 *
 * @param word 검사할 낱말
 * @returns 받침이 있으면 참
 */
function hasFinalConsonant(word: string) {
  const offset = word.charCodeAt(word.length - 1) - HANGUL_SYLLABLE_START;

  return (
    offset >= 0 &&
    offset < HANGUL_SYLLABLE_COUNT &&
    offset % HANGUL_FINAL_CONSONANT_COUNT !== 0
  );
}

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
