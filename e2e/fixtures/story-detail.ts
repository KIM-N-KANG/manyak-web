import type { Page } from '@playwright/test';

import { CHAT_START_SHEET_COPY } from '@/features/stories/detail/constants/start-setting-copy';

/**
 * 스토리 상세의 채팅 시작 시트를 열고 반환한다.
 * @param page 스토리 상세를 연 페이지
 * @returns 열린 채팅 시작 시트
 */
export async function openChatStartSheet(page: Page) {
  await page.getByRole('button', { name: '새 채팅 시작하기' }).click();

  return page.getByRole('dialog', { name: CHAT_START_SHEET_COPY.title });
}

/**
 * 스토리 상세에서 채팅 시작 시트를 열고 지금 고른 값으로 채팅을 시작한다.
 * @param page 스토리 상세를 연 페이지
 */
export async function startChatFromDetail(page: Page) {
  const sheet = await openChatStartSheet(page);

  await sheet
    .getByRole('button', { name: CHAT_START_SHEET_COPY.start })
    .click();
}
