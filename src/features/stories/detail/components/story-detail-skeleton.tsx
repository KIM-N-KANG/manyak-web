import { Skeleton } from '@/components/ui/skeleton';

export function StoryDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-4" aria-hidden>
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-3/4 w-full rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-7/12" />
          <Skeleton className="h-5 w-9/12" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-3/12" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-7/12" />
          </div>
          <div>
            <Skeleton className="h-4 w-11/12" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/12" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-3/12" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-2/12" />
            <Skeleton className="h-4 w-5/12" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-2/12" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-9/12" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-3/12" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
