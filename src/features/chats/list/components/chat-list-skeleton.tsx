import { Fragment } from 'react';

import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatListSkeleton() {
  return (
    <ul className="flex flex-col gap-2 py-4" aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <Fragment key={index}>
          <div className="flex flex-col gap-2 px-4 py-2">
            <li className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-3/12" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Skeleton className="h-4 w-8 self-end" />
                <Skeleton className="h-4 w-16 self-end" />
              </div>
            </li>
          </div>
          {index < 5 && <Separator />}
        </Fragment>
      ))}
    </ul>
  );
}
