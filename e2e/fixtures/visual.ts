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
 * 자동재생 영상을 지정한 시점에 멈춰 스냅샷이 흔들리지 않게 한다.
 * 재생 중에는 찍을 때마다 프레임이 달라 비교가 성립하지 않는다.
 *
 * @param page 대상 페이지
 * @param time 정지시킬 재생 시점(초)
 */
export async function freezeVideos(page: Page, time = 0): Promise<void> {
  await page.evaluate(async (seekTo) => {
    const videos = [...document.querySelectorAll('video')];

    await Promise.all(
      videos.map(async (video) => {
        // preload="none"으로 아직 받지 않은 영상은 포스터만 그려져 이미 정적이다.
        // 탐색을 걸어도 seeked가 오지 않아 대기 시간만 늘어나므로 건너뛴다.
        if (video.readyState === 0) {
          return;
        }

        video.pause();
        video.currentTime = seekTo;

        if (video.readyState >= 2 && video.currentTime === seekTo) {
          return;
        }

        await new Promise<void>((resolve) => {
          video.addEventListener('seeked', () => resolve(), { once: true });
          setTimeout(resolve, 3_000);
        });
      }),
    );
  }, time);
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
