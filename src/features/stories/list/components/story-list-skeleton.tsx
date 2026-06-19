import { Fragment } from 'react';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function StoryListSkeleton() {
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
