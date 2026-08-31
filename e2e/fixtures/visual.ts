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

/**
 * next-themes가 `.dark` 클래스를 붙일 때까지 기다린다.
 * 테마는 하이드레이션 이후 클라이언트에서 적용되므로(`attribute="class"`,
 * `defaultTheme="system"`), 이 대기 없이 찍으면 라이트 모드가 섞여 들어온다.
 * Playwright 프로젝트의 `colorScheme: 'dark'`가 시스템 선호를 다크로 만든 상태를 전제한다.
 *
 * @param page 대상 페이지
 */
export async function waitForDarkTheme(page: Page): Promise<void> {
  await page
    .locator('html.dark')
    .waitFor({ state: 'attached', timeout: 5_000 });
}
