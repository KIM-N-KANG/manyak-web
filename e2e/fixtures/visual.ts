import type { Page } from '@playwright/test';

/** 상대 시간("N일 전") 렌더가 결정적이도록 고정하는 기준 시각. 목킹 데이터(`2026-06-01`) 하루 뒤다. */
export const VISUAL_FIXED_NOW = new Date('2026-06-02T12:00:00Z');

/**
 * 웹폰트 로드가 끝나기 전 스크린샷이 찍히지 않도록 대기한다.
 *
 * @param page 대상 페이지
 */
export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}
