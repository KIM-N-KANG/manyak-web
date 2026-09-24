import { Skeleton } from '@/components/ui/skeleton';

import { STORY_LIST_COPY } from '../constants';

export function StoryListSkeleton() {
  return (
    <ul
      role="status"
      aria-label={STORY_LIST_COPY.loadingLabel}
      className="grid grid-cols-2 gap-x-2 gap-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} aria-hidden="true" className="flex flex-col gap-2">
          <Skeleton className="aspect-3/4 w-full rounded-lg" />
          <div className="flex flex-col gap-0.5">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}
