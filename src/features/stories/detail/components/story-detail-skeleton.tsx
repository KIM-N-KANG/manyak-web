import { Skeleton } from '@/components/ui/skeleton';

export function StoryDetailSkeleton() {
  return (
    <div className="story-detail-skeleton flex flex-col gap-8 pb-4" aria-hidden>
      <div className="flex flex-col gap-4">
        <div className="border-b border-border">
          <Skeleton className="aspect-3/4 w-full rounded-none" />
        </div>
        <div className="flex flex-col gap-3 px-4">
          <div className="flex flex-col gap-2">
            <div className="flex h-8 items-center">
              <Skeleton className="h-6 w-3/5" />
            </div>
            <div className="flex h-6 items-center">
              <Skeleton className="h-4 w-9/10" />
            </div>
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-7 w-18 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-22 rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <div className="flex h-7 items-center">
          <Skeleton className="h-5 w-3/10" />
        </div>
        <div>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex h-8 items-center">
              <Skeleton
                className={index === 2 ? 'h-4 w-[55%]' : 'h-4 w-full'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
