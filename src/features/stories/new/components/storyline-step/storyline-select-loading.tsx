import {
  STORYLINE_GENERATING_LOADING_HINTS,
  STORYLINE_GENERATING_LOADING_PHRASES,
  STORYLINE_SELECT_LOADING_LABEL,
} from '../../constants';
import { StoryGeneratingLoading } from '../shared/story-generating-loading';

export function StorylineSelectLoading() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={STORYLINE_SELECT_LOADING_LABEL}>
      <div className="p-4">
        <StoryGeneratingLoading
          phrases={STORYLINE_GENERATING_LOADING_PHRASES}
          label="스토리라인을 구상하고 있어요"
          hints={STORYLINE_GENERATING_LOADING_HINTS}
        />
      </div>
    </div>
  );
}
