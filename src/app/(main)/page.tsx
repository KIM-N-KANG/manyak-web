import { Suspense } from 'react';

import type { Metadata, ResolvingMetadata } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { HOME_DESCRIPTION, SITE_NAME, SITE_URL } from '@/constants/site';
import {
  HomeStoryList,
  StoryList,
} from '@/features/stories/list/components/home-story-list';
import { DEFAULT_STORY_LIST_QUERY } from '@/features/stories/list/constants';
import { fetchPublicStoriesOnServer } from '@/lib/stories/backend-story-client';

/**
 * 루트의 브랜드 이미지를 유지하며 홈 설명과 대표 URL을 설정한다.
 * @param _props 홈 페이지 props
 * @param parent 루트에서 상속한 메타데이터
 * @returns 홈 검색 결과와 공유 미리보기 메타데이터
 */
export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { openGraph, twitter } = await parent;

  return {
    description: HOME_DESCRIPTION,
    alternates: { canonical: `${SITE_URL}${APP_PATH.MAIN.STORIES}` },
    openGraph: {
      ...openGraph,
      title: SITE_NAME,
      description: HOME_DESCRIPTION,
      url: `${SITE_URL}${APP_PATH.MAIN.STORIES}`,
    },
    twitter: {
      ...twitter,
      card: 'summary_large_image',
      title: SITE_NAME,
      description: HOME_DESCRIPTION,
    },
  };
}

export default async function StoriesPage() {
  const initialPage =
    (await fetchPublicStoriesOnServer(DEFAULT_STORY_LIST_QUERY)) ?? undefined;

  return (
    <main className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <StoryList
            query={DEFAULT_STORY_LIST_QUERY}
            initialPage={initialPage}
          />
        }>
        <HomeStoryList initialPage={initialPage} />
      </Suspense>
    </main>
  );
}
