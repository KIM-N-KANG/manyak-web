import { Skeleton } from '@/components/ui/skeleton';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';

export function HomeSectionsSkeleton() {
  return (
    <div
      role="status"
      aria-label={STORY_LIST_COPY.loadingLabel}
      className="flex flex-col gap-8">
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div
          key={sectionIndex}
          aria-hidden="true"
          className="flex flex-col gap-3">
          <Skeleton className="mx-4 h-7 w-32" />
          <div className="flex gap-2 overflow-hidden px-4">
            {Array.from({ length: 3 }).map((__, index) => (
              <div
                key={index}
                className="flex w-[calc((100%-1rem)/2)] shrink-0 flex-col gap-2">
                <Skeleton className="aspect-3/4 w-full rounded-lg" />
                <div className="flex flex-col px-1">
                  <Skeleton className="h-6 w-3/4" />
                  <div className="mt-0.5 flex h-10 flex-col justify-center gap-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Skeleton className="h-5 w-12 rounded-4xl" />
                    <Skeleton className="h-5 w-10 rounded-4xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
