type RandomSuggestion = {
  text: string;
  position: number;
};

/**
 * 추천 문구 목록에서 공백이 아닌 항목 하나를 무작위로 고른다.
 *
 * @param suggestions 추천 문구 목록
 * @param random 0 이상 1 미만 난수를 반환하는 함수(기본값 Math.random)
 * @returns 선택된 문구와 원래 위치. 유효한 후보가 없으면 null
 */
export function getRandomSuggestion(
  suggestions: string[],
  random: () => number = Math.random,
): RandomSuggestion | null {
  const candidates = suggestions.flatMap((suggestion, position) => {
    const text = suggestion.trim();

    return text ? [{ text, position }] : [];
  });

  if (candidates.length === 0) {
    return null;
  }

  const candidateIndex = Math.max(
    0,
    Math.min(Math.floor(random() * candidates.length), candidates.length - 1),
  );

  return candidates[candidateIndex] ?? null;
}
