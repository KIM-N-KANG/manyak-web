import { expect, mockChatShareView, test } from '../fixtures/test';

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

test.describe('공유 열람 화면 비주얼', () => {
  test('헤더와 CTA가 보이는 초기 상태', async ({ page }) => {
    await mockChatShareView(page, SHARE_BODY);
    await page.goto('/shares/share-1');

    await expect(page.getByRole('banner')).toHaveCSS('opacity', '1');
    await expect(
      page.getByText('먼지 쌓인 책 한 권이 눈에 들어왔다'),
    ).toBeVisible();

    await expect(page).toHaveScreenshot('shared-chat.png');
  });
});
