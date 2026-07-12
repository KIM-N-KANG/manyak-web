type RandomSuggestion = {
  text: string;
  position: number;
};

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
