import { Skeleton } from '@/components/ui/skeleton';

export function StoryListSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 p-4 pb-8" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="flex flex-col gap-2">
          <Skeleton className="aspect-3/4 w-full rounded-lg" />
          {/* 카드 텍스트 영역의 고정 높이(h-24)에 맞춘다. */}
          <div className="flex h-24 flex-col gap-0.5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="mt-1.5 flex gap-1">
              <Skeleton className="h-5 w-10 rounded-4xl" />
              <Skeleton className="h-5 w-12 rounded-4xl" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
