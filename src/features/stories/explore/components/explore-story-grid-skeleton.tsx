import { Skeleton } from '@/components/ui/skeleton';
import { STORY_LIST_COPY } from '@/features/stories/_shared/constants/story-list';
import { cn } from '@/lib/utils';

/** 골격 칸 면 위의 글 자리. 면과 함께 깜빡이므로 자기 애니메이션 없이 한 단계 진한 색만 둔다. */
const TEXT_BAR_CLASS = 'rounded-md bg-foreground/5';

/**
 * 탐색 타일 한 칸의 골격. 실제 타일처럼 표지와 글 영역을 한 면으로 채우고, 표지 아래쪽에 겹쳐 올라간
 * 글 자리에 제목, 한 줄 소개 두 줄, 장르 배지 막대를 둔다. 높이는 실제 타일과 같다.
 */
export function ExploreStoryTileSkeleton() {
  return (
    <li aria-hidden="true">
      <Skeleton className="flex flex-col rounded-none">
        <div className="aspect-3/4" />
        <div className="relative -mt-6 px-3 pb-3">
          <div className={cn(TEXT_BAR_CLASS, 'my-0.5 h-4 w-3/4')} />
          <div className={cn(TEXT_BAR_CLASS, 'mt-1.5 h-3 w-full')} />
          <div className={cn(TEXT_BAR_CLASS, 'mt-1 h-3 w-2/3')} />
          <div
            className={cn(TEXT_BAR_CLASS, 'mt-1.5 h-4.5 w-12 rounded-4xl')}
          />
        </div>
      </Skeleton>
    </li>
  );
}

export function ExploreStoryGridSkeleton() {
  return (
    <ul
      role="status"
      aria-label={STORY_LIST_COPY.loadingLabel}
      className="grid grid-cols-2 gap-0.5">
      {Array.from({ length: 12 }).map((_, index) => (
        <ExploreStoryTileSkeleton key={index} />
      ))}
    </ul>
  );
}
