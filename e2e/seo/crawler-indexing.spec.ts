import { expect, test } from '../fixtures/test';

const GOOGLEBOT_UA =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/125.0.6422.175 Safari/537.36';

test.describe('검색 크롤러 색인', () => {
  test.describe('크롤러 User-Agent', () => {
    test.use({ userAgent: GOOGLEBOT_UA });

    test('크롤러는 온보딩으로 리다이렉트되지 않고 홈을 받는다', async ({
      page,
    }) => {
      const response = await page.goto('/');

      // 온보딩 게이트는 서버(proxy) 리다이렉트이므로 응답 URL로 확인한다.
      expect(new URL(response!.url()).pathname).toBe('/');
      expect(response!.status()).toBe(200);

      // 페이지 제목 검증은 라우트 어나운서와의 충돌을 피해 banner로 스코프한다.
      await expect(
        page.getByRole('banner').getByRole('heading', { name: '홈' }),
      ).toBeVisible();
    });
  });

  test('robots.txt는 수집 규칙과 사이트맵 위치를 알려준다', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');

    expect(response.status()).toBe(200);

    const body = await response.text();

    expect(body).toContain('User-Agent: *');
    expect(body).toContain('Disallow: /chats');
    expect(body).toContain('Disallow: /my');
    // 스토리 상세는 페이지 robots 메타가 색인 여부를 정하므로 크롤을 막지 않는다.
    expect(body).not.toContain('Disallow: /stories');
    expect(body).toContain('Sitemap: https://manyak.app/sitemap.xml');
  });

  test('sitemap.xml은 대표 URL(홈)과 정적 공개 페이지를 포함한다', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');

    expect(response.status()).toBe(200);

    const body = await response.text();

    expect(body).toContain('<loc>https://manyak.app/</loc>');
    expect(body).toContain('<loc>https://manyak.app/about</loc>');
  });

  test('오리지널로 확인되지 않는 스토리 상세는 색인을 막는다', async ({
    page,
  }) => {
    // E2E 서버는 백엔드에 닿지 않아 오리지널 목록을 읽지 못한다. 판별 불가 시 noindex다.
    await page.goto('/stories/s1');

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });
});
