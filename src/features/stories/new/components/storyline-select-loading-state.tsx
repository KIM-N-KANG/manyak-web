import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  STORYLINE_GENERATING_LOADING_PHRASES,
  STORYLINE_SELECT_LOADING_LABEL,
  STORYLINE_TAB_LABELS,
} from '../constants';
import { StoryGeneratingLoading } from './story-generating-loading';

export function StorylineSelectLoadingState() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={STORYLINE_SELECT_LOADING_LABEL}>
      <Tabs defaultValue="0" className="gap-0">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4.25 pb-4">
          <TabsList>
            {STORYLINE_TAB_LABELS.map((label, index) => (
              <TabsTrigger key={index} value={String(index)} disabled>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="px-4">
          <StoryGeneratingLoading
            phrases={STORYLINE_GENERATING_LOADING_PHRASES}
            label="스토리라인을 구상하고 있어요"
          />
        </div>
      </Tabs>
    </div>
  );
}
