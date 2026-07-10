import type { Ref } from 'react';

import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';

import { StoryDetailTags } from './story-detail-tags';
import { StoryStartSettings } from './story-start-settings';

type StoryInfo = {
  title?: string;
  oneLineIntro?: string | null;
  description?: string | null;
  genres?: string[];
  startSettings?: StoryStartSettingResponse[];
};

type StoryInfoSectionProps = {
  story: StoryInfo;
  titleRef?: Ref<HTMLHeadingElement>;
  startSettingValue: string;
  onStartSettingValueChange: (value: string) => void;
};

export function StoryInfoSection({
  story,
  titleRef,
  startSettingValue,
  onStartSettingValueChange,
}: StoryInfoSectionProps) {
  const genres = story.genres ?? [];
  const startSettings = story.startSettings ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 ref={titleRef} className="text-2xl font-bold">
            {story.title}
          </h1>
          <p className="text-lg">{story.oneLineIntro}</p>
        </div>
        <StoryDetailTags genres={genres} />
      </div>

      {story.description && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">주요 내용</h2>
          <TextContent>{story.description}</TextContent>
        </div>
      )}

      {startSettings.length > 0 && (
        <StoryStartSettings
          startSettings={startSettings}
          value={startSettingValue}
          onValueChange={onStartSettingValueChange}
        />
      )}
    </div>
  );
}
