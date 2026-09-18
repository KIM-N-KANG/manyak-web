import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { SITE_CONTACT_EMAIL } from '@/constants/site';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import {
  ONBOARDING_BROWSE_LABEL,
  ONBOARDING_SECTIONS,
  ONBOARDING_START_LABEL,
} from '@/features/onboarding/constants';

import { oneLine } from '../fixtures/copy';
import { expect, seedStoryIds, skipOnboarding, test } from '../fixtures/test';

/** 1×1 투명 PNG. 브라우저는 요청한 확장자와 무관하게 실제 응답 형식을 따른다. */
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * `next/image` 최적화 응답을 1×1 이미지로 대체한다.
 *
 * 랜딩은 최적화 대상 이미지를 8장 이상 싣는데, CI처럼 최적화 캐시가 비어 있고
 * `sharp`가 없는 환경에서는 이 변환이 Next 서버를 오래 붙잡는다. 그 사이 클릭이
 * 만든 라우팅 요청(`?_rsc=`)까지 함께 응답을 못 받아 이동이 일어나지 않는다.
 *
 * 이동만 검증하는 케이스는 이미지 렌더 결과가 필요 없으므로 최적화를 건너뛴다.
 * 이미지 자체를 보는 케이스(랜딩 스크롤·비주얼 회귀)에는 적용하지 않는다.
 *
 * @param page 대상 페이지
 */
async function stubOptimizedImages(page: Page): Promise<void> {
  await page.route('**/_next/image**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: TRANSPARENT_PNG,
    }),
  );
}

test.describe('온보딩', () => {
  test('새 방문자는 첫 진입 시 온보딩 페이지로 이동한다', async ({ page }) => {
    const response = await page.goto('/');

    // 홈이 그려진 뒤 클라이언트에서 이동하면 화면이 깜빡이므로,
    // 서버(proxy) 리다이렉트로 도착했는지 응답 URL로 확인한다.
    expect(new URL(response!.url()).pathname).toBe('/onboarding');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await expect(
      page.getByRole('heading', {
        name: '눈을 떠보니 스토리 속 주인공이 되었다',
      }),
    ).toBeVisible();

    // 헤더 오른쪽에 보조(둘러보기)·주(바로 시작하기) 버튼이 나란히 있고,
    // 로고는 더 이상 홈 링크가 아니며 하단 고정 CTA도 없다.
    const header = page.getByRole('banner');

    await expect(
      header.getByRole('button', { name: ONBOARDING_BROWSE_LABEL }),
    ).toBeVisible();
    await expect(
      header.getByRole('button', { name: ONBOARDING_START_LABEL }),
    ).toBeVisible();
    await expect(
      header.getByRole('button', { name: '홈으로 이동' }),
    ).toHaveCount(0);
    await expect(
      page.locator('nav').filter({ hasText: ONBOARDING_START_LABEL }),
    ).toHaveCount(0);
  });

  test('온보딩 리다이렉트는 원본 쿼리를 유지한다', async ({ page }) => {
    const response = await page.goto(
      '/?utm_source=th&utm_medium=social&utm_campaign=organic&utm_content=bio',
    );

    // 서버 리다이렉트라 브라우저가 원본 URL을 렌더하지 않으므로, 여기서
    // 쿼리를 잃으면 분석 SDK가 유입 출처를 수집할 기회 자체가 사라진다.
    const url = new URL(response!.url());

    expect(url.pathname).toBe('/onboarding');
    expect(url.searchParams.get('utm_source')).toBe('th');
    expect(url.searchParams.get('utm_medium')).toBe('social');
    expect(url.searchParams.get('utm_campaign')).toBe('organic');
    expect(url.searchParams.get('utm_content')).toBe('bio');
    expect(url.searchParams.get('from')).toBe('/');
  });

  test('랜딩 섹션이 사용 흐름 순서대로 표시되고 끝까지 스크롤할 수 있다', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    // 섹션 제목이 스토리 만들기 → 채팅 → 공유 흐름 순서 그대로 나열된다.
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      ONBOARDING_SECTIONS.map((section) => section.title),
    );
    await expect(
      page.getByRole('img', { name: ONBOARDING_SECTIONS[0].scenes[0].alt }),
    ).toBeVisible();

    // 본문 끝에는 "바로 시작하기" CTA, 그 아래에 정책 링크·문의처를 담은 푸터가 이어진다.
    // main 안의 footer는 contentinfo 랜드마크가 아니므로 요소로 찾는다.
    const footer = page.locator('footer');

    await footer.scrollIntoViewIfNeeded();
    await expect(
      page
        .getByRole('main')
        .getByRole('button', { name: ONBOARDING_START_LABEL }),
    ).toBeVisible();
    await expect(
      footer.getByRole('link', { name: '이용약관' }),
    ).toHaveAttribute('href', APP_PATH.TERMS);
    await expect(
      footer.getByRole('link', { name: '개인정보 처리방침' }),
    ).toHaveAttribute('href', APP_PATH.PRIVACY);
    await expect(
      footer.getByRole('link', { name: SITE_CONTACT_EMAIL }),
    ).toHaveAttribute('href', `mailto:${SITE_CONTACT_EMAIL}`);
    // 헤더는 스크롤 영역의 형제라 끝까지 내려도 헤더 CTA는 계속 보인다.
    await expect(
      page
        .getByRole('banner')
        .getByRole('button', { name: ONBOARDING_START_LABEL }),
    ).toBeVisible();

    // 로고는 홈 링크가 아니라 맨 위로 되돌리는 버튼이다.
    await page
      .getByRole('banner')
      .getByRole('button', { name: '맨 위로 이동' })
      .click();

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
    await expect
      .poll(() => page.getByRole('main').evaluate((main) => main.scrollTop))
      .toBe(0);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`저장한 ${theme} 테마에 맞는 온보딩 이미지가 순서대로 표시된다`, async ({
      page,
    }) => {
      // 테마·원본 자산 검증을 CI의 이미지 최적화 대기와 분리한다.
      // 최적화된 화면은 별도의 비주얼 회귀 검사에서 검증한다.
      await page.route('**/_next/image**', async (route) => {
        const url = new URL(route.request().url());
        const source = url.searchParams.get('url');

        if (source?.startsWith('/onboarding/')) {
          await route.continue({ url: new URL(source, url.origin).href });
        } else {
          await route.continue();
        }
      });
      await page.emulateMedia({
        colorScheme: theme === 'light' ? 'dark' : 'light',
      });
      await page.addInitScript(
        (value) => localStorage.setItem('theme', value),
        theme,
      );
      await page.goto(APP_PATH.ONBOARDING);

      const sections = page.getByRole('main').locator('section');

      await expect(sections).toHaveCount(6);
      expect(ONBOARDING_SECTIONS.map((section) => section.key)).toEqual([
        'keywords',
        'storyline',
        'chat',
        'image-generation',
        'suggestion',
        'share',
      ]);

      for (const [index, section] of ONBOARDING_SECTIONS.entries()) {
        const container = sections.nth(index);

        await expect(container.getByRole('heading')).toHaveText(section.title);
        await expect(
          container.getByText(section.description, { exact: true }),
        ).toBeAttached();
        await expect(container.getByRole('img')).toHaveCount(
          section.scenes.length,
        );

        for (const scene of section.scenes) {
          const image = container.getByRole('img', {
            name: scene.alt,
            exact: true,
          });

          await image.scrollIntoViewIfNeeded();
          await expect(image).toBeVisible();
          await expect
            .poll(
              () =>
                image.evaluate((element) => {
                  const img = element as HTMLImageElement;

                  return img.complete && img.naturalWidth > 0;
                }),
              { timeout: 15_000, message: `${theme}: ${scene.src}` },
            )
            .toBe(true);

          const src = await image.getAttribute('src');

          expect(new URL(src!, page.url()).searchParams.get('url')).toBe(
            theme === 'dark' ? scene.darkSrc : scene.src,
          );
        }
      }
    });
  }

  test('시스템 테마가 바뀌면 온보딩 이미지도 즉시 바뀐다', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(APP_PATH.ONBOARDING);

    const scene = ONBOARDING_SECTIONS[0].scenes[0];
    const image = page.getByRole('img', { name: scene.alt, exact: true });

    await expect(image).toHaveAttribute(
      'src',
      new RegExp(encodeURIComponent(scene.src)),
    );
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(image).toHaveAttribute(
      'src',
      new RegExp(encodeURIComponent(scene.darkSrc)),
    );
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(image).toHaveAttribute(
      'src',
      new RegExp(encodeURIComponent(scene.src)),
    );
  });

  test('채팅·제작 탭으로 진입해도 온보딩 페이지로 이동한다', async ({
    page,
  }) => {
    await page.goto(APP_PATH.MAIN.CHATS);

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page.context().clearCookies();
    await page.goto(APP_PATH.MAIN.STUDIO);

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);
  });

  test('온보딩을 본 사용자는 온보딩으로 이동하지 않는다', async ({ page }) => {
    await skipOnboarding(page);
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: '홈' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('만든 스토리만 있는 방문자(쿠키 없음)는 온보딩을 노출하지 않고 홈으로 되돌린다', async ({
    page,
  }) => {
    await seedStoryIds(page, ['s1']);
    await page.goto('/');

    // 서버(proxy)는 쿠키가 없어 일단 온보딩으로 보내지만, 페이지 가드가
    // 생성 이력을 보고 쿠키를 심은 뒤 홈으로 되돌린다.
    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });

  test('열람한 사용자가 온보딩에 직접 접근하면 홈으로 되돌린다', async ({
    page,
  }) => {
    await skipOnboarding(page);
    await page.goto('/onboarding');

    await expect(page).toHaveURL(/\/$/);
  });

  test('헤더 "바로 시작하기"를 누르면 제작 화면으로 이동하고 게스트에게는 로그인 시트를 띄운다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page
      .getByRole('banner')
      .getByRole('button', { name: ONBOARDING_START_LABEL })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    // 온보딩 사용자는 게스트이므로 제작은 로그인 게이트에서 멈추고 퍼널 1단계는 그리지 않는다.
    await expect(
      page
        .getByRole('dialog')
        .getByRole('heading', { name: oneLine(LOGIN_COPY.title) }),
    ).toBeVisible();
    await expect(page.getByText('키워드를 선택해주세요')).toHaveCount(0);
  });

  test('본문 끝 "바로 시작하기"를 눌러도 스토리 생성으로 이동한다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    const bottomCta = page
      .getByRole('main')
      .getByRole('button', { name: ONBOARDING_START_LABEL });

    await bottomCta.scrollIntoViewIfNeeded();
    await bottomCta.click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
  });

  test('"둘러보기"를 누르면 홈으로 가고 새로고침 후에도 온보딩이 다시 뜨지 않는다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page
      .getByRole('banner')
      .getByRole('button', { name: ONBOARDING_BROWSE_LABEL })
      .click();

    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });
});
