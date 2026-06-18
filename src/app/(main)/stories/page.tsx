import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';
import { StoryList } from '@/features/stories/list/components/story-list';
import { MOCK_STORIES } from '@/features/stories/list/mock';

export default function StoriesPage() {
  /** @todo 목데이터 사용안할 때 제거해야 함 */
  if (MOCK_STORIES.length === 0) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <section
          aria-labelledby="story-empty-title"
          className="flex flex-col items-center gap-8">
          <div className="flex flex-col gap-1 text-center">
            <h3 id="story-empty-title" className="text-lg font-semibold">
              아직 만든 스토리가 없어요
            </h3>
            <p>3단계로 간단하게 스토리를 만들어보세요</p>
          </div>

          <Button
            nativeButton={false}
            render={<Link href={APP_PATH.CREATOR.STORY} />}
            size="lg">
            <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
            <span>스토리 만들기</span>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <StoryList />
    </main>
  );
}
