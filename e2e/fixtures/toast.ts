import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 토스트가 닫히길 기다린다. 모바일 폭에서는 위쪽 토스트가 헤더 버튼을 덮고, 버튼을 누른 포인터가
 * 토스트 위에 머물면 sonner가 닫힘 타이머를 멈춘다. 터치 기기처럼 포인터를 화면 왼쪽 아래로 치운 뒤 기다린다.
 */
export async function waitForToastToClose(page: Page, toast: Locator) {
  const height = page.viewportSize()?.height ?? 600;

  await page.mouse.move(1, height - 1);
  await expect(toast).toBeHidden();
}
