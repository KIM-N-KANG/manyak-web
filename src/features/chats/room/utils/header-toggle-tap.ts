/** 누르면 자기 동작을 하는 요소. 이 안의 탭은 헤더 표시 전환으로 보지 않는다. */
const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, label, [role="button"], [role="link"], [contenteditable="true"]';

/** 키보드를 띄우는 입력 요소. 입력 중 키보드를 닫으려는 탭을 가리는 데 쓴다. */
export const EDITABLE_SELECTOR = 'input, textarea, [contenteditable="true"]';

/**
 * 채팅 메시지 영역의 탭이 헤더 표시 전환 탭인지 판정한다.
 * 버튼·링크 같은 조작 요소 위의 탭과 텍스트를 선택한 채 끝난 탭은 제외한다.
 *
 * @param target 탭이 끝난 요소
 * @returns 헤더 표시를 전환해야 하면 true
 */
export function isHeaderToggleTap(target: EventTarget | null) {
  if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) {
    return false;
  }

  return !window.getSelection()?.toString();
}
