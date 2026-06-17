import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import {
  STORYLINE_SELECT_LOADING_LABEL,
  STORYLINE_SELECT_LOADING_TAB_COUNT,
  STORYLINE_TEXT_SKELETON_WIDTH_CLASSES,
} from '../constants';

function StorylineTextSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {STORYLINE_TEXT_SKELETON_WIDTH_CLASSES.map((widthClass, index) => (
        <Skeleton key={index} className={`h-4 leading-loose ${widthClass}`} />
      ))}
    </div>
  );
}

export function StorylineSelectLoadingState() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={STORYLINE_SELECT_LOADING_LABEL}>
      <div
        className="flex h-9 shrink-0 items-center justify-center"
        aria-hidden="true">
        {Array.from({ length: STORYLINE_SELECT_LOADING_TAB_COUNT }).map(
          (_, index) => (
            <div
              key={index}
              className="flex h-full flex-1 items-center justify-center">
              <p className="text-sm text-foreground-secondary">{index + 1}</p>
            </div>
          ),
        )}
      </div>
      <Separator className="mt-1" />
      <div className="p-4 pt-6">
        <StorylineTextSkeleton />
      </div>
    </div>
  );
}
