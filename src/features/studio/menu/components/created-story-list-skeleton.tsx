import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';

export function CreatedStoryListSkeleton() {
  return (
    <ul className="flex flex-col" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <li key={index} className="flex gap-4 px-4 py-2">
          <AspectRatio ratio={3 / 4} className="w-32 shrink-0">
            <Skeleton className="size-full rounded-lg" />
          </AspectRatio>
          <div className="flex min-h-[10.6667rem] min-w-0 flex-1 flex-col justify-between py-0.5">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/5" />
              <div className="mt-1 flex gap-1">
                <Skeleton className="h-5 w-18 rounded-4xl" />
                <Skeleton className="h-5 w-14 rounded-4xl" />
              </div>
            </div>
            <div className="mt-1 flex justify-end gap-2">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-5 w-18" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
