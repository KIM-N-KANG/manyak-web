import { Skeleton } from '@/components/ui/skeleton';

import {
  STORYLINE_SELECT_LOADING_LABEL,
  STORYLINE_TEXT_SKELETON_WIDTH_CLASSES,
} from '../constants';

export function StorylineSelectLoadingState() {
  return (
    <div
      className="flex flex-col p-4"
      aria-busy="true"
      aria-label={STORYLINE_SELECT_LOADING_LABEL}>
      <Skeleton className="h-9 w-44 rounded-lg" />
      <div className="pt-6">
        <div className="flex flex-col gap-3" aria-hidden="true">
          {STORYLINE_TEXT_SKELETON_WIDTH_CLASSES.map((widthClass, index) => (
            <Skeleton
              key={index}
              className={`h-4 leading-loose ${widthClass}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
