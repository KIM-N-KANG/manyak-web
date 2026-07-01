import { Fragment } from 'react';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function StoryListSkeleton() {
  return (
    <ul className="flex flex-col" aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <Fragment key={index}>
          <li className="flex gap-4 p-4">
            <Skeleton className="aspect-3/4 w-16 shrink-0 rounded-sm" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="size-6 shrink-0" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-5 w-10 rounded-4xl" />
                <Skeleton className="h-5 w-12 rounded-4xl" />
                <Skeleton className="h-5 w-10 rounded-4xl" />
              </div>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-24 self-end" />
            </div>
          </li>
          {index < 9 && <Separator className="mx-4 data-horizontal:w-auto" />}
        </Fragment>
      ))}
    </ul>
  );
}
