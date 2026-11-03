import { Skeleton } from '@/components/ui/skeleton';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';

export function ExploreStoryGridSkeleton() {
  return (
    <ul
      role="status"
      aria-label={STORY_LIST_COPY.loadingLabel}
      className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }).map((_, index) => (
        <li key={index} aria-hidden="true">
          <Skeleton className="aspect-3/4 w-full rounded-none" />
        </li>
      ))}
    </ul>
  );
}
