import Link from 'next/link';

import type { SimpleStoryCreateResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { StoryDetailTags } from '@/features/stories/detail/components/story-detail-tags';

import { StoryCreateStepFooter } from './story-create-step-footer';

type StoryCompletionSectionProps = {
  isCompletingStory: boolean;
  completedStory?: SimpleStoryCreateResponse | null;
};

function StoryCompletionLoadingState() {
  return (
    <div className="flex flex-col gap-8" aria-label="스토리 완성 중">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-7/12" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-8/12" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-3/12" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-7/12" />
          </div>
          <div>
            <Skeleton className="h-4 w-11/12" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/12" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-3/12" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-2/12" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-2/12" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

type StoryInfoSectionProps = {
  story: SimpleStoryCreateResponse;
};

function StoryInfoSection({ story }: StoryInfoSectionProps) {
  const genres = story.genres ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{story.title}</h1>
          <StoryDetailTags genres={genres} />
        </div>
        <p className="text-base">{story.oneLineIntro}</p>
      </div>

      {story.description && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">상세 설명</h2>
          <TextContent>{story.description}</TextContent>
        </div>
      )}

      {story.startSetting && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">시작 상황</h2>
          <div className="flex flex-col gap-4">
            {story.startSetting.name && (
              <div className="flex flex-col gap-2">
                <Label>상황 이름</Label>
                <div className="rounded-md bg-muted px-3.5 py-2.5">
                  <TextContent size="sm">{story.startSetting.name}</TextContent>
                </div>
              </div>
            )}
            {story.startSetting.startSituation && (
              <div className="flex flex-col gap-2">
                <Label>상황 설명</Label>
                <div className="rounded-md bg-muted px-3.5 py-2.5">
                  <TextContent size="sm">
                    {story.startSetting.startSituation}
                  </TextContent>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StoryCompletionSection({
  isCompletingStory,
  completedStory,
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
