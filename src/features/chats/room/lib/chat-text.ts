export type ChatTextSegment = {
  text: string;
  /** 단일 *...* — 내레이션/속마음 (보조 색상) */
  emphasis: boolean;
  /** 이중 **...** — 볼드 */
  bold: boolean;
};

// **...** (볼드)를 먼저, 그다음 이중 '*'가 아닌 단일 *...* (강조)를 매칭
const SEGMENT_PATTERN = /\*\*([^*\n]+?)\*\*|(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g;

export function parseChatSegments(line: string): ChatTextSegment[] {
  const segments: ChatTextSegment[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(SEGMENT_PATTERN)) {
    const index = match.index ?? 0;

    if (index > lastIndex) {
      segments.push({
        text: line.slice(lastIndex, index),
        emphasis: false,
        bold: false,
      });
    }

    if (match[1] != null) {
      segments.push({ text: match[1], emphasis: false, bold: true });
    } else {
      segments.push({ text: match[2], emphasis: true, bold: false });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push({
      text: line.slice(lastIndex),
      emphasis: false,
      bold: false,
    });
  }

  return segments;
}
