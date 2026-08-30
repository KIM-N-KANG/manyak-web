import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';

export function ChatListSkeleton() {
  return (
    <ul className="flex flex-col pb-2" aria-hidden>
      {Array.from({ length: 10 }).map((_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-2">
          <AspectRatio ratio={3 / 4} className="w-12 shrink-0">
            <Skeleton className="size-full rounded-sm" />
          </AspectRatio>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-col gap-0.5">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-3.5 w-full" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
