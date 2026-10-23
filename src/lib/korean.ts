const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_COUNT = 11172;
const HANGUL_FINAL_CONSONANT_COUNT = 28;

/**
 * 낱말이 받침으로 끝나는지 반환한다. 한글 음절로 끝나지 않으면 받침이 없는 것으로 본다.
 *
 * @param word 검사할 낱말
 * @returns 받침이 있으면 참
 */
export function hasFinalConsonant(word: string) {
  const offset = word.charCodeAt(word.length - 1) - HANGUL_SYLLABLE_START;

  return (
    offset >= 0 &&
    offset < HANGUL_SYLLABLE_COUNT &&
    offset % HANGUL_FINAL_CONSONANT_COUNT !== 0
  );
}

/** 받침 ㄹ의 종성 순번이다. ㄹ 받침 뒤에는 "으로" 대신 "로"를 붙인다. */
const FINAL_CONSONANT_RIEUL = 8;

/**
 * 낱말 뒤에 붙일 조사 "으로" 또는 "로"를 고른다. 받침이 없거나 ㄹ 받침이면 "로"다. 한글 음절로 끝나지 않으면
 * 받침이 없는 것으로 본다.
 *
 * @param word 조사를 붙일 낱말
 * @returns "으로" 또는 "로"
 */
export function getEuroParticle(word: string): '으로' | '로' {
  const offset = word.charCodeAt(word.length - 1) - HANGUL_SYLLABLE_START;
  const isHangul = offset >= 0 && offset < HANGUL_SYLLABLE_COUNT;
  const finalConsonant = offset % HANGUL_FINAL_CONSONANT_COUNT;

  return isHangul &&
    finalConsonant !== 0 &&
    finalConsonant !== FINAL_CONSONANT_RIEUL
    ? '으로'
    : '로';
}
