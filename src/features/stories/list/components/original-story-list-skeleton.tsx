import { Skeleton } from '@/components/ui/skeleton';

export function OriginalStoryListSkeleton() {
  return (
    <section
      role="status"
      aria-label="오리지널 스토리 불러오는 중"
      className="flex flex-col gap-3 px-4 pb-4">
      <div aria-hidden="true" className="flex flex-col gap-3">
        <Skeleton className="h-7 w-32" />
        <ul className="grid grid-cols-2 gap-x-2 gap-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <li key={index} className="flex flex-col gap-2">
              <Skeleton className="aspect-3/4 w-full rounded-lg" />
              {/* 오리지널 카드의 텍스트 영역(제목 1줄 + 제작자 1줄)에 맞춘다. */}
              <div className="flex flex-col gap-0.5">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
