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
