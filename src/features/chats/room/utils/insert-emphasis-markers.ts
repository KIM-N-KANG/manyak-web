/**
 * 선택 구간을 *...* 강조 마커로 감싼 텍스트와 감싼 뒤의 커서 위치를 계산한다.
 * 선택이 없으면 커서 위치에 빈 마커를 삽입하고 커서를 마커 사이에 둔다.
 *
 * @param text 원본 텍스트
 * @param selectionStart 선택 구간 시작 인덱스
 * @param selectionEnd 선택 구간 끝 인덱스
 * @returns 마커를 삽입한 값과 새 커서 시작·끝 위치
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
