import type { Ref } from 'react';

import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { formatDate } from '@/lib/format-date';

import { StoryDetailTags } from './story-detail-tags';
import { StoryStartSettings } from './story-start-settings';

type StoryInfo = {
  title?: string;
  oneLineIntro?: string | null;
  description?: string | null;
  genres?: string[];
  reachedEndings?: string[];
  startSettings?: StoryStartSettingResponse[];
  createdAt?: string;
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
  const reachedEndings = story.reachedEndings ?? [];
  const startSettings = story.startSettings ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <h1 ref={titleRef} className="text-2xl font-bold">
            {story.title}
          </h1>
          {story.oneLineIntro ? (
            <p className="text-foreground-secondary">{story.oneLineIntro}</p>
          ) : null}
        </div>
        {genres.length > 0 ? <StoryDetailTags genres={genres} /> : null}
        {reachedEndings.length > 0 ? (
          <StoryDetailTags genres={reachedEndings} />
        ) : null}
      </div>

      {story.description && (
        <div className="flex flex-col gap-4">
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

      {story.createdAt && (
        <div className="-mx-4 flex items-center justify-between bg-muted px-4 py-3 text-sm text-foreground-secondary">
          <span className="font-semibold">생성일</span>
          <time dateTime={story.createdAt}>{formatDate(story.createdAt)}</time>
        </div>
      )}
    </div>
  );
}
