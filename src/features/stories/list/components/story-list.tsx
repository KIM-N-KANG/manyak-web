'use client';

import { Fragment } from 'react';

import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';

import { useCreatedStories } from '../hooks/use-created-stories';
import { StoryCard } from './story-card';

export function StoryList() {
  const { stories, isLoading, isError, isEmpty, refetch } = useCreatedStories();

  if (isLoading) {
    return <StoryListSkeleton />;
  }

  if (isError) {
    return (
      <StoryListStatus
        title="스토리를 불러오지 못했어요"
        description="잠시 후 다시 시도해주세요">
        <Button variant="outline" size="lg" onClick={() => refetch()}>
          다시 시도
        </Button>
      </StoryListStatus>
    );
  }

  if (isEmpty) {
    return (
      <StoryListStatus
        title="아직 만든 스토리가 없어요"
        description="3단계로 간단하게 스토리를 만들어보세요">
        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.CREATOR.STORY} />}
          size="lg">
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          <span>스토리 만들기</span>
        </Button>
      </StoryListStatus>
    );
  }

  return (
    <ul className="flex flex-col gap-4 p-4">
      {stories.map((story, index) => (
        <Fragment key={story.id}>
          <li>
            <StoryCard story={story} />
          </li>
          {index < stories.length - 1 && <Separator />}
        </Fragment>
      ))}
    </ul>
  );
}

function StoryListStatus({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <section className="flex flex-col items-center gap-8">
        <div className="flex flex-col gap-1 text-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </div>
  );
}

function StoryListSkeleton() {
  return (
    <ul className="flex flex-col gap-4 p-4" aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <Fragment key={index}>
          <li className="flex flex-col gap-2">
            <Skeleton className="h-6 w-3/12" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-10" />
            </div>
            <Skeleton className="h-[2lh] w-full" />
            <Skeleton className="h-5 w-24 self-end" />
          </li>
          {index < 5 && <Separator />}
        </Fragment>
      ))}
    </ul>
  );
}
