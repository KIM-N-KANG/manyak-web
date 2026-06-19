import Link from 'next/link';

import type { SimpleStoryCreateResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

import { StoryCompletionLoadingState } from './story-completion-loading-state';
import { StoryCreateStepFooter } from './story-create-step-footer';
import { StoryInfoSection } from './story-info-section';

type StoryCompletionSectionProps = {
  isCompletingStory: boolean;
  completedStory?: SimpleStoryCreateResponse | null;
  onScroll?: (event: React.UIEvent<HTMLElement>) => void;
};

export function StoryCompletionSection({
  isCompletingStory,
  completedStory,
  onScroll,
}: StoryCompletionSectionProps) {
  const titleLines = isCompletingStory
    ? ['스토리를 만들고 있어요', '잠시만 기다려 주세요']
    : ['스토리가 완성되었어요!', '채팅으로 이야기를 이어가보세요'];
  const description = isCompletingStory
    ? '모든 정보를 바탕으로 스토리를 구상하고 있어요'
    : '내 스토리에 저장되어 언제든 채팅을 이어갈 수 있어요';

  return (
    <main
      className="flex min-h-0 flex-1 scrollbar-none flex-col overflow-y-auto pb-16"
      onScroll={onScroll}
      aria-busy={isCompletingStory}>
      <section className="flex flex-1 flex-col">
        <div className="flex flex-col gap-1 p-4">
          <h1 className="text-xl font-semibold">
            {titleLines.map((titleLine) => (
              <span key={titleLine} className="block">
                {titleLine}
              </span>
            ))}
          </h1>
          <p className="text-foreground-secondary">{description}</p>
        </div>

        <div className="p-4">
          {isCompletingStory && <StoryCompletionLoadingState />}
          {!isCompletingStory && completedStory && (
            <StoryInfoSection story={completedStory} />
          )}
        </div>
      </section>

      {!isCompletingStory && (
        <StoryCreateStepFooter>
          <Button
            nativeButton={false}
            render={<Link href={APP_PATH.MAIN.STORIES} />}
            size="lg"
            variant="secondary"
            className="min-w-0 flex-1">
            내 스토리로 이동하기
          </Button>
          <Button type="button" size="lg" className="min-w-0 flex-1">
            채팅 시작하기
          </Button>
        </StoryCreateStepFooter>
      )}
    </main>
  );
}
