/**
 * 선택 구간을 *...* 강조 마커로 감싼 텍스트와 감싼 뒤의 커서 위치를 계산한다.
 * 선택이 없으면 커서 위치에 빈 마커를 삽입하고 커서를 마커 사이에 둔다.
 */
export function insertEmphasisMarkers(
  text: string,
  selectionStart: number,
  selectionEnd: number,
): { value: string; cursorStart: number; cursorEnd: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);

  const value = `${before}*${selected}*${after}`;
  const cursorStart = selectionStart + 1;
  const cursorEnd = cursorStart + selected.length;

  return { value, cursorStart, cursorEnd };
}
