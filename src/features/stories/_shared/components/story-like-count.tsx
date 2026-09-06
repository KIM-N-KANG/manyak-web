import { HeartOutlineIcon } from '@/components/icons/heart-outline-icon';
import { STORY_LIKE_COPY } from '@/features/stories/_shared/constants/story-like';
import { cn } from '@/lib/utils';

type StoryLikeCountProps = {
  likeCount: number;
  size?: 'sm' | 'md';
};

export function StoryLikeCount({
  likeCount,
  size = 'md',
}: StoryLikeCountProps) {
  return (
    <div
      className={cn(
        'flex h-auto items-center gap-1 rounded-full font-medium text-white',
        size === 'md'
          ? 'bg-black/70 px-3 py-1 text-sm'
          : 'bg-black/20 px-2 py-0.5 text-xs backdrop-blur-md',
      )}>
      <HeartOutlineIcon
        className={size === 'md' ? 'size-4' : 'size-3.5'}
        aria-hidden="true"
      />
      <p>
        <span className="sr-only">{STORY_LIKE_COPY.count} </span>
        {likeCount.toLocaleString()}
      </p>
    </div>
  );
}
