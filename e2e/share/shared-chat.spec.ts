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

  test('CTA가 스토리 생성 퍼널로 연결된다', async ({ page }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    // Button nativeButton={false} + render={<Link/>}는 앵커를 그리되 Base UI가
    // role="button"을 붙인다. 이동은 href로 이뤄지므로 링크 대상을 함께 확인한다.
    await expect(page.getByRole('button', { name: CTA_NAME })).toHaveAttribute(
      'href',
      '/stories/new',
    );
  });

  test('CTA로 스토리 생성에 들어가면 이후 홈에서 온보딩이 뜨지 않는다', async ({
    page,
  }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    await page.getByRole('button', { name: CTA_NAME }).click();
    await expect(page).toHaveURL(/\/stories\/new$/);

    // 온보딩 게이트는 서버(proxy)가 쿠키로 판정하므로, 홈에 직접 진입해
    // 리다이렉트 없이 도착했는지를 응답 URL로 확인한다(smoke/onboarding과 동일 방식).
    const response = await page.goto('/');

    expect(new URL(response!.url()).pathname).toBe('/');
    await expect(page).toHaveURL(/\/$/);
  });

  test('홈 버튼이 홈으로 연결된다', async ({ page }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    await expect(
      page
        .getByRole('banner')
        .getByRole('button', { name: '홈 화면으로 이동 버튼' }),
    ).toHaveAttribute('href', '/');
  });

  test('본문을 탭해도 헤더와 CTA는 고정된 채 남는다', async ({ page }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/share/share-1');

    const header = page.getByRole('banner');
    const cta = page.getByRole('button', { name: CTA_NAME });

    await expect(header).toBeVisible();
    await expect(cta).toBeVisible();

    await page.getByText('오래된 도서관의 문이 열렸다').click();

    // 채팅방과 같은 셸이라 헤더·CTA는 본문 탭에 반응하지 않는다(토글 없음).
    await expect(header).toBeVisible();
    await expect(cta).toBeVisible();
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
