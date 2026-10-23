import { expect, test } from '../fixtures/test';

test.describe('검색 크롤러 색인', () => {
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
