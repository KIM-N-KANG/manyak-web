import { Skeleton } from '@/components/ui/skeleton';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';

export function ExploreStoryGridSkeleton() {
  return (
    <ul
      role="status"
      aria-label={STORY_LIST_COPY.loadingLabel}
      className="grid grid-cols-2 gap-0.5">
      {Array.from({ length: 12 }).map((_, index) => (
        <li key={index} aria-hidden="true">
          <Skeleton className="aspect-3/4 w-full rounded-none" />
          <div className="relative -mt-6 px-3 pb-3">
            <Skeleton className="my-0.5 h-4 w-3/4" />
            <Skeleton className="mt-1.5 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
