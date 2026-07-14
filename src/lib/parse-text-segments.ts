/** 텍스트 한 줄을 스타일별로 나눈 조각 */
export type TextSegment = {
  text: string;
  /** 단일 *...* — 내레이션/속마음 (보조 색상) */
  emphasis: boolean;
  /** 이중 **...** — 볼드 */
  bold: boolean;
};

/** `**...**` (볼드)를 먼저, 그다음 이중 '*'가 아닌 단일 `*...*` (강조)를 매칭 */
const SEGMENT_PATTERN = /\*\*([^*\n]+?)\*\*|(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g;

/**
 * 텍스트 한 줄을 마크다운 유사 문법에 따라 세그먼트로 분리한다.
 * `**...**`는 볼드, 단일 `*...*`는 강조(내레이션/속마음)로 파싱한다.
 *
 * @param line 파싱할 텍스트 한 줄
 * @returns 스타일별로 나뉜 세그먼트 배열
 */
export function parseTextSegments(line: string): TextSegment[] {
  const segments: TextSegment[] = [];
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
