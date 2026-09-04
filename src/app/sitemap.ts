import type { MetadataRoute } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { SITE_URL } from '@/constants/site';
import { fetchOriginalStoriesOnServer } from '@/lib/stories/backend-story-client';

/**
 * 오리지널 목록은 운영 중 바뀌므로 빌드 시점에 굳히지 않고 요청마다 만든다.
 */
export const dynamic = 'force-dynamic';

/** 색인 대상 정적 공개 페이지. 개인화·인증 화면은 색인 대상이 아니므로 넣지 않는다. */
const STATIC_PUBLIC_PATHS = [
  APP_PATH.MAIN.STORIES,
  APP_PATH.ABOUT,
  APP_PATH.TERMS,
  APP_PATH.PRIVACY,
];

/**
 * 정적 공개 페이지와 오리지널 스토리 상세 URL 목록.
 * lastModified는 빌드 시각을 넣으면 배포마다 갱신된 것처럼 보여 생략한다.
 * 오리지널 목록 조회에 실패하면 정적 페이지만 싣는다.
 *
 * @returns `sitemap.xml`로 직렬화될 URL 목록
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const originals = (await fetchOriginalStoriesOnServer()) ?? [];
  const storyPaths = originals.flatMap((story) =>
    story.id ? [APP_PATH.STORY_DETAIL(story.id)] : [],
  );

  return [...STATIC_PUBLIC_PATHS, ...storyPaths].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
  }));
}
