import { APP_PATH } from '@/constants/app-path';
import { HOME_DESCRIPTION, SITE_URL } from '@/constants/site';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';

import {
  expect,
  mockMemberSession,
  skipOnboarding,
  test,
} from '../fixtures/test';

test.skip(
  process.env.E2E_SEO !== '1',
  'E2E_SEO=1로 서버 조회용 목을 실행한다.',
);

const storyId = 'seo-original';
const title = '별빛 도서관';
const intro = '잃어버린 이야기를 찾는 밤';
const description = '별빛이 비추는 서가에서 나의 이야기를 찾아보세요.';

test('홈의 첫 HTML에 설명, canonical, 제목이 있는 상세 링크를 싣는다', async ({
  request,
  page,
}) => {
  const response = await request.get(APP_PATH.MAIN.STORIES, {
    headers: { 'User-Agent': 'Googlebot' },
  });
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain(
    `<meta name="description" content="${HOME_DESCRIPTION}"`,
  );

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];

  expect(canonical && new URL(canonical).href).toBe(`${SITE_URL}/`);
  expect(html).toMatch(
    /property="og:image" content="[^"]+\/opengraph-image\.png/,
  );
  expect(html).toMatch(
    new RegExp(
      `<a[^>]+href="${APP_PATH.STORY_DETAIL(storyId)}"[^>]*>${title}</a>`,
    ),
  );
  await skipOnboarding(page);
  await page.goto(APP_PATH.MAIN.STORIES);

  const card = page.locator('article').filter({
    has: page.getByRole('link', { name: `${title} 상세 보기` }),
  });

  await card.click({ position: { x: 20, y: 20 } });
  await expect(page).toHaveURL(
    new RegExp(`${APP_PATH.STORY_DETAIL(storyId)}$`),
  );
});

test.describe('JavaScript 실행 전', () => {
  test.use({ javaScriptEnabled: false });

  test('일반 사용자 HTML에도 공개 본문을 싣고 숨겨진 설정은 제외한다', async ({
    page,
  }) => {
    const response = await page.goto(APP_PATH.STORY_DETAIL(storyId));
    const html = await response!.text();

    expect(response!.status()).toBe(200);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${title}</h1>`));
    expect(html).not.toContain('PRIVATE_');
    // 스트리밍 HTML은 JS가 실행되기 전까지 Next의 숨김 컨테이너에 있을 수 있다.
    await expect(page.locator('h1')).toHaveText(title);
    await expect(page.getByText(description, { exact: true })).toBeAttached();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      intro,
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      'content',
      title,
    );
    await expect(
      page.locator('meta[name="twitter:description"]'),
    ).toHaveAttribute('content', intro);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}${APP_PATH.STORY_DETAIL(storyId)}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /\/opengraph-image\.png/,
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      'content',
      /\/opengraph-image\.png/,
    );
  });
});

test('공개 본문을 유지하며 개인화 응답을 받은 뒤 좋아요를 활성화한다', async ({
  page,
}) => {
  await mockMemberSession(page);

  let release: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(`**/api/v1/stories/${storyId}`, async (route) => {
    await ready;
    await route.fulfill({
      json: {
        id: storyId,
        title,
        oneLineIntro: intro,
        description,
        isLiked: true,
        isOwner: false,
        startSettings: [],
      },
    });
  });

  try {
    await page.goto(APP_PATH.STORY_DETAIL(storyId));
    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible();
    // 하트는 처음부터 자리를 지키되 개인화 응답 전에는 잠근다.
    await expect(
      page.getByRole('button', { name: STORY_LIKE_COPY.like, exact: true }),
    ).toBeDisabled();
    await expect(page.locator('main + nav button').last()).toBeDisabled();
    release();
    await expect(
      page.getByRole('button', { name: STORY_LIKE_COPY.unlike }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('main + nav button').last()).toBeEnabled();
  } finally {
    release();
  }
});

for (const id of [
  'seo-unavailable',
  'seo-missing',
  'seo-private',
  'user-story',
]) {
  test(`${id}: 서버 실패나 비공개 판정 뒤에도 클라이언트 열람은 복구한다`, async ({
    page,
  }) => {
    await page.route(`**/api/v1/stories/${id}`, (route) =>
      route.fulfill({ json: { id, title: '복구된 스토리', isOwner: true } }),
    );

    const response = await page.goto(APP_PATH.STORY_DETAIL(id));
    const html = await response!.text();

    expect(html).not.toContain('PRIVATE_STORY_TITLE');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
    await expect(
      page.getByRole('heading', { level: 1, name: '복구된 스토리' }),
    ).toBeVisible();
  });
}
