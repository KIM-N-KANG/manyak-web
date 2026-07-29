import { expect, mockChatShareView, test } from '../fixtures/test';

// 공유 열람(/share/[shareId])은 온보딩 게이트 매처(/, /chats, /my) 밖이라 게이팅이 없다.
// 열람: GET /api/v1/shares/{shareId} (무인증).
const SHARE_BODY = {
  id: 'share-1',
  storyId: 'story-1',
  storyTitle: '별빛 도서관',
  prologue: '오래된 도서관의 문이 열렸다',
  turns: [
    {
      userInput: '책장을 살펴본다',
      aiOutput: '먼지 쌓인 책 한 권이 눈에 들어왔다',
      reachedEnding: null,
      createdAt: '2026-07-29T00:00:00Z',
    },
  ],
};

const CTA_NAME = '마냑에서 내 스토리 만들기';

test.describe('공유된 채팅 열람', () => {
  test('스토리 제목과 대화가 순서대로 보인다', async ({ page }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    await expect(
      page.getByRole('banner').getByText('별빛 도서관'),
    ).toBeVisible();
    await expect(page.getByText('오래된 도서관의 문이 열렸다')).toBeVisible();
    await expect(page.getByText('책장을 살펴본다')).toBeVisible();
    await expect(
      page.getByText('먼지 쌓인 책 한 권이 눈에 들어왔다'),
    ).toBeVisible();
  });

  test('CTA가 홈으로 연결된다', async ({ page }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    // Button nativeButton={false} + render={<Link/>}는 앵커를 그리되 Base UI가
    // role="button"을 붙인다. 이동은 href로 이뤄지므로 링크 대상을 함께 확인한다.
    await expect(page.getByRole('button', { name: CTA_NAME })).toHaveAttribute(
      'href',
      '/',
    );
  });

  test('본문을 탭하면 헤더와 CTA가 사라지고 다시 탭하면 돌아온다', async ({
    page,
  }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    // 오버레이는 opacity로 사라지는데 Playwright는 opacity:0도 visible로 보므로,
    // 실제 상태인 계산된 opacity와 inert 속성으로 검증한다.
    const header = page.getByRole('banner');
    const ctaBar = page.getByRole('button', { name: CTA_NAME }).locator('..');
    const body = page.getByText('오래된 도서관의 문이 열렸다');

    await expect(header).toHaveCSS('opacity', '1');
    await expect(ctaBar).toHaveCSS('opacity', '1');

    await body.click();

    await expect(header).toHaveCSS('opacity', '0');
    await expect(ctaBar).toHaveCSS('opacity', '0');
    await expect(ctaBar).toHaveAttribute('inert', '');

    await body.click();

    await expect(header).toHaveCSS('opacity', '1');
    await expect(ctaBar).toHaveCSS('opacity', '1');
  });

  test('없는 링크는 안내 화면을 보여준다', async ({ page }) => {
    await mockChatShareView(page, { message: 'not found' }, 404);
    await page.goto('/share/missing');

    await expect(page.getByText('공유된 채팅을 찾을 수 없어요')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '마냑 둘러보기' }),
    ).toBeVisible();
  });
});
