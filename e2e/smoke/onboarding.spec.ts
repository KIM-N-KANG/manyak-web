import type { Page } from '@playwright/test';

import { APP_BANNER_COPY } from '@/constants/app-banner';
import { APP_PATH } from '@/constants/app-path';
import { SITE_CONTACT_EMAIL } from '@/constants/site';
import {
  ONBOARDING_FEATURES,
  ONBOARDING_HEADER_BROWSE_LABEL,
  ONBOARDING_HEADER_CREATE_LABEL,
  ONBOARDING_PLAY_STORE_BADGE_ALT,
  ONBOARDING_PLAY_STORE_URL,
  ONBOARDING_TITLE_LINES,
} from '@/features/onboarding/constants';

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

/**
 * 기능 소개 갤러리에서 지정한 카드가 가운데에 멈춰 있는 위치로 본문을 스크롤한다.
 * 갤러리 구간을 카드 사이 간격만큼 똑같이 나눈 계약에 맞춰 해당 카드 위치로 옮긴다.
 *
 * @param page 대상 페이지
 * @param label 갤러리 구간의 접근성 이름
 * @param slideIndex 가운데에 둘 카드 순번
 * @param slideCount 갤러리의 전체 카드 수
 */
async function scrollToGallerySlide(
  page: Page,
  label: string,
  slideIndex: number,
  slideCount: number,
): Promise<void> {
  await page.getByRole('main').evaluate(
    (main, [name, index, count]) => {
      const section = main.querySelector<HTMLElement>(
        `section[aria-label="${name}"]`,
      )!;
      const top =
        section.getBoundingClientRect().top -
        main.getBoundingClientRect().top +
        main.scrollTop;
      const travel = section.offsetHeight - main.clientHeight;

      main.scrollTo({ top: top + (travel * index) / (count - 1) });
    },
    [label, slideIndex, slideCount] as const,
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
      page.getByRole('heading', { name: ONBOARDING_TITLE_LINES.join(' ') }),
    ).toBeVisible();

    // 첫 방문 소개를 가리지 않도록 앱 안내 배너를 띄우지 않는다. 제목은 클라이언트 게이트를
    // 통과한 뒤에 그려지므로, 이때는 배너 판정도 이미 끝났다.
    await expect(
      page.getByRole('region', { name: APP_BANNER_COPY.regionLabel }),
    ).toHaveCount(0);

    // 맨 위에서는 첫 화면 이미지가 화면을 차지하고 헤더는 숨어 있다.
    // 헤더에는 로고와 둘러보기, 시작하기 버튼이 있다.
    const header = page.getByRole('banner', { includeHidden: true });

    await expect(header).toBeHidden();
    await expect(
      header.getByRole('button', { includeHidden: true }),
    ).toHaveCount(3);

    // 첫 화면 아래쪽 스크롤 신호를 누르면 첫 화면을 지나 첫 기능 소개까지 내려간다.
    // 내려가면 스크롤 신호는 사라지고 헤더가 나타나 맨 위 로고 버튼을 누를 수 있다.
    const scrollCue = page.getByRole('button', { name: '아래로 이동' });

    await scrollCue.click();
    await expect
      .poll(() =>
        page
          .getByRole('main')
          .evaluate(
            (main) =>
              main.scrollTop === main.querySelector('section')!.offsetHeight,
          ),
      )
      .toBe(true);
    await expect(scrollCue).toBeHidden();
    await expect(page.getByRole('banner')).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByRole('banner')
          .evaluate((element) => getComputedStyle(element).opacity),
      )
      .toBe('1');
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

  test('스크롤하면 기능 카드가 사용 순서대로 옆으로 흐르고 끝까지 내려갈 수 있다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');

    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    // 기능 소개마다 카드 갤러리가 붙어 있고, 스크롤 위치에 따라 카드가 옆으로 흘러
    // 사용 순서대로 가운데에 온다. 갤러리 아래에는 섹션에 맞는 버튼이 함께 붙어 있다.
    for (const feature of ONBOARDING_FEATURES) {
      const gallery = page.getByRole('region', { name: feature.label });

      for (const [index, slide] of feature.slides.entries()) {
        await scrollToGallerySlide(
          page,
          feature.label,
          index,
          feature.slides.length,
        );
        await expect(gallery.locator('li[aria-current="step"] h3')).toHaveText(
          slide.title,
        );
        await expect(
          gallery.getByRole('img', { name: slide.alt, exact: true }),
        ).toBeVisible();
        await expect(
          gallery.getByRole('button', { name: feature.action.label }),
        ).toBeVisible();
      }
    }

    // 마지막 갤러리 뒤에는 따로 시작 섹션 없이 정책 링크, 문의처, Google Play 배지를 담은 푸터가 이어진다.
    // main 안의 footer는 contentinfo 랜드마크가 아니므로 요소로 찾는다.
    const footer = page.locator('footer');

    await footer.scrollIntoViewIfNeeded();
    await expect(
      footer.getByRole('link', { name: '이용약관' }),
    ).toHaveAttribute('href', APP_PATH.TERMS);
    await expect(
      footer.getByRole('link', { name: '개인정보 처리방침' }),
    ).toHaveAttribute('href', APP_PATH.PRIVACY);
    await expect(
      footer.getByRole('link', { name: SITE_CONTACT_EMAIL }),
    ).toHaveAttribute('href', `mailto:${SITE_CONTACT_EMAIL}`);
    await expect(
      footer.getByRole('link', { name: ONBOARDING_PLAY_STORE_BADGE_ALT }),
    ).toHaveAttribute('href', ONBOARDING_PLAY_STORE_URL);
    // 헤더는 첫 화면을 지난 뒤로 계속 보이고, 로고는 홈 링크가 아니라 맨 위로
    // 되돌리는 버튼이다.
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
      // 비주얼 회귀도 원본 WebP를 사용하며 이미지 최적화 자체는 검증하지 않는다.
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

      for (const feature of ONBOARDING_FEATURES) {
        const gallery = page.getByRole('region', { name: feature.label });

        for (const [index, slide] of feature.slides.entries()) {
          await scrollToGallerySlide(
            page,
            feature.label,
            index,
            feature.slides.length,
          );

          const image = gallery.getByRole('img', {
            name: slide.alt,
            exact: true,
          });

          await expect(image).toBeVisible();
          await expect
            .poll(
              () =>
                image.evaluate((element) => {
                  const img = element as HTMLImageElement;

                  return img.complete && img.naturalWidth > 0;
                }),
              { timeout: 15_000, message: `${theme}: ${slide.src}` },
            )
            .toBe(true);

          const src = await image.getAttribute('src');

          expect(new URL(src!, page.url()).searchParams.get('url')).toBe(
            theme === 'dark' ? slide.darkSrc : slide.src,
          );
        }
      }
    });
  }

  test('시스템 테마가 바뀌면 온보딩 이미지도 즉시 바뀐다', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(APP_PATH.ONBOARDING);

    const scene = ONBOARDING_FEATURES[0].slides[0];
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

  test('스토리 만들기 섹션 아래 버튼을 누르면 게스트도 동의 없이 제작 입력 화면으로 이동한다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    const feature = ONBOARDING_FEATURES.find(({ key }) => key === 'create')!;

    await page
      .getByRole('region', { name: feature.label })
      .getByRole('button', { name: feature.action.label })
      .click();

    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );
    await expect(page.getByText('키워드를 선택해주세요')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('채팅 섹션 아래 버튼을 누르면 홈으로 가고 새로고침 후에도 온보딩이 다시 뜨지 않는다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    const feature = ONBOARDING_FEATURES.find(({ key }) => key === 'chat')!;

    await page
      .getByRole('region', { name: feature.label })
      .getByRole('button', { name: feature.action.label })
      .click();

    await expect(page).toHaveURL(/\/$/);

    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });

  test('헤더 시작하기 버튼은 제작 입력 화면으로, 둘러보기 버튼은 홈으로 이동한다', async ({
    page,
  }) => {
    await stubOptimizedImages(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding(\?|$)/);

    await page.getByRole('button', { name: '아래로 이동' }).click();

    const header = page.getByRole('banner');

    await header
      .getByRole('button', { name: ONBOARDING_HEADER_CREATE_LABEL })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${APP_PATH.STUDIO.STORY.SIMPLE}$`),
    );

    // 시작하기로 온보딩을 본 것으로 기록됐으므로 새 방문자로 다시 연다.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/onboarding');
    await page.getByRole('button', { name: '아래로 이동' }).click();
    await header
      .getByRole('button', { name: ONBOARDING_HEADER_BROWSE_LABEL })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });
});
