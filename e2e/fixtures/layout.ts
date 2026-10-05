import type { Page } from '@playwright/test';

/** 공백 없이 이어지는 긴 영문·숫자다. 줄바꿈 기회가 없어 넘침을 드러낸다. */
export const UNBROKEN_TEXT = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(3);

/** 띄어쓰기가 있는 긴 문장이다. 줄바꿈을 막은 요소의 넘침을 드러낸다. */
export const SPACED_LONG_TEXT = '용과 맺은 약속을 지키기 위해 떠나는 '
  .repeat(5)
  .trim();

/**
 * 화면에서 글이 옆으로 넘치는 요소를 찾는다. 글이 요소 폭을 넘거나 요소가 화면 오른쪽 밖으로 나가면
 * 넘친 것으로 본다. 한 줄 말줄임으로 줄인 요소, 스크린 리더 전용 요소, 보이지 않는 측정용 요소는 뺀다.
 *
 * @param page 검사할 페이지
 * @returns 넘치는 요소 글의 앞 20자 목록
 */
export function findOverflowingTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const found: string[] = [];

    for (const element of document.querySelectorAll('body *')) {
      if (!(element instanceof HTMLElement)) continue;

      const hasOwnText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );

      if (!hasOwnText || element.closest('.sr-only')) continue;

      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      if (style.visibility === 'hidden' || rect.width === 0) continue;

      const isTruncated =
        style.textOverflow === 'ellipsis' && style.whiteSpace === 'nowrap';

      if (
        (element.scrollWidth > element.clientWidth + 1 && !isTruncated) ||
        rect.right > viewportWidth + 1
      ) {
        found.push((element.textContent ?? '').trim().slice(0, 20));
      }
    }

    return found;
  });
}
