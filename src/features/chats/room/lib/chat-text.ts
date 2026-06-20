const LINE_BREAK_PATTERN = /\r?\n+/u;
const SENTENCE_BREAK_PATTERN = /(?<=[.!?。！？…])\s+/u;
// 앞뒤가 또 다른 '*'가 아닌 단일 '*'로 둘러싼 구간만 매칭(이중 '**' 제외)
const EMPHASIS_PATTERN = /(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g;

export function getContentLines(text: string): string[] {
  return text
    .split(LINE_BREAK_PATTERN)
    .flatMap((line) => line.split(SENTENCE_BREAK_PATTERN))
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseEmphasisSegments(
  line: string,
): Array<{ text: string; emphasis: boolean }> {
  const segments: Array<{ text: string; emphasis: boolean }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(EMPHASIS_PATTERN)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, index), emphasis: false });
    }

    segments.push({ text: match[1], emphasis: true });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), emphasis: false });
  }

  return segments;
}
