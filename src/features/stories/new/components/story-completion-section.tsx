import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';

import { StoryCreateStepFooter } from './story-create-step-footer';

type StoryCompletionSectionProps = {
  isCompletingStory: boolean;
};

function StoryCompletionLoadingState() {
  return (
    <div className="flex flex-col gap-8" aria-label="스토리 완성 중">
      <div className="flex flex-col gap-2">
        <Skeleton className="w-1.5/12 h-3.5" />
        <Skeleton className="h-4 w-5/12" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-2/12" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/12" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-2/12" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/12" />
          <Skeleton className="h-4 w-0" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/12" />
          <Skeleton className="h-4 w-0" />
          <Skeleton className="h-4 w-11/12" />
        </div>
      </div>
    </div>
  );
}

export function StoryCompletionSection({
  isCompletingStory,
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
      aria-busy={isCompletingStory}>
      <section className="flex flex-1 flex-col">
        <div className="flex flex-col gap-1 border-b border-border p-4">
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
