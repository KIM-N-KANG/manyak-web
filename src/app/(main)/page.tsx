import { Suspense } from 'react';

import {
  HomeStoryList,
  StoryList,
} from '@/features/stories/list/components/home-story-list';
import { DEFAULT_STORY_LIST_QUERY } from '@/features/stories/list/constants';
import { fetchPublicStoriesOnServer } from '@/lib/stories/backend-story-client';

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
