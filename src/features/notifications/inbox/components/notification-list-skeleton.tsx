import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** 알림 카드와 같은 골격(분류 줄, 제목, 본문)을 여섯 장 늘어놓는다. */
export function NotificationListSkeleton() {
  return (
    <ul className="flex flex-col py-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, index) => (
        <li key={index} className="px-4 py-2">
          <div className="flex flex-col gap-2 pt-0.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton
              className={cn('h-5', index % 2 === 0 ? 'w-4/5' : 'w-3/5')}
            />
            <Skeleton className="h-4 w-11/12" />
          </div>
        </li>
      ))}
    </ul>
  );
}
