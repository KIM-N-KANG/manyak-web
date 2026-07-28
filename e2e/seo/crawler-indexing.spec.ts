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
    expect(body).toContain('Sitemap: https://manyak.app/sitemap.xml');
  });

  test('sitemap.xml은 대표 URL(홈)을 포함한다', async ({ request }) => {
    const response = await request.get('/sitemap.xml');

    expect(response.status()).toBe(200);

    const body = await response.text();

    expect(body).toContain('<loc>https://manyak.app/</loc>');
  });
});
