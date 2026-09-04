import { OriginalStoryList } from '@/features/stories/list/components/original-story-list';
import { fetchOriginalStoriesOnServer } from '@/lib/stories/backend-story-client';

export default async function StoriesPage() {
  // 검색 크롤러가 받는 첫 HTML에 오리지널 목록이 실리도록 서버에서 먼저 읽는다.
  // 실패하면 undefined를 넘겨 클라이언트 조회로 폴백한다.
  const initialStories = await fetchOriginalStoriesOnServer();

  return (
    <main className="flex flex-1 flex-col">
      <OriginalStoryList initialStories={initialStories ?? undefined} />
    </main>
  );
}
