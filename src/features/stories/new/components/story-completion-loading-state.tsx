import { Skeleton } from '@/components/ui/skeleton';

import {
  STORY_COMPLETION_LOADING_LABEL,
  STORY_COMPLETION_TEXT_SKELETON_WIDTH_CLASSES,
} from '../constants';

export function StoryCompletionLoadingState() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={STORY_COMPLETION_LOADING_LABEL}>
      <div className="flex flex-col gap-3" aria-hidden="true">
        {STORY_COMPLETION_TEXT_SKELETON_WIDTH_CLASSES.map(
          (widthClass, index) => (
            <Skeleton
              key={index}
              className={`h-4 leading-loose ${widthClass}`}
            />
          ),
        )}
      </div>
    </div>
  );
}
