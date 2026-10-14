import type { Page } from '@playwright/test';

import { APP_PATH } from '@/constants/app-path';
import { STORYLINE_GENERATE_LABEL } from '@/features/stories/new/constants';

import { ART_STYLE_CATALOG_FIXTURE } from './api-mock';

/**
 * 생성 요청 없이 키워드를 입력하고 스토리라인 생성 버튼을 반환한다.
 * @param page 대상 페이지
 * @returns 키워드 입력을 마친 생성 버튼
 */
export async function prepareStoryGeneration(page: Page) {
  await page.route('**/api/v1/stories/simple/tags', (route) =>
    route.fulfill({
      json: [
        { id: 1, name: '판타지', category: 'GENRE' },
        { id: 2, name: '용감한', category: 'PROTAGONIST' },
      ],
    }),
  );
  await page.goto(APP_PATH.STUDIO.STORY.SIMPLE);
  await page.getByRole('button', { name: '판타지', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '용감한', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();

  return page.getByRole('button', {
    name: STORYLINE_GENERATE_LABEL,
    exact: true,
  });
}

/**
 * 추가 정보 단계에서 이미지 스타일을 고르고 "스토리 완성하기"를 누른다. 이미지 스타일은 필수이고
 * 처음에는 아무것도 고르지 않은 상태다. 복원한 초안처럼 이미 골라 둔 선택은 바꾸지 않는다.
 * @param page 대상 페이지
 */
export async function completeStory(page: Page) {
  const [, artStyle] = ART_STYLE_CATALOG_FIXTURE;

  await page.getByRole('radio').first().waitFor({ state: 'attached' });

  if ((await page.getByRole('radio', { checked: true }).count()) === 0) {
    await page.getByText(artStyle.name, { exact: true }).click();
  }

  await page.getByRole('button', { name: '스토리 완성하기' }).click();
}
