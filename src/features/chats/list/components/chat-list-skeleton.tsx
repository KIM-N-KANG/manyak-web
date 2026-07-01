import { Fragment } from 'react';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatListSkeleton() {
  return (
    <ul className="flex flex-col" aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <Fragment key={index}>
          <li className="flex flex-col gap-1 p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="size-6 shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-full" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-5 w-16" />
            </div>
          </li>
          {index < 9 && <Separator className="mx-4 data-horizontal:w-auto" />}
        </Fragment>
      ))}
    </ul>
  );
}
