import type { Ref } from 'react';

import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';

import { StoryDetailTags } from './story-detail-tags';

type StoryInfo = {
  title?: string;
  oneLineIntro?: string | null;
  description?: string | null;
  genres?: string[];
  startSetting?: StoryStartSettingResponse | null;
};

type StoryInfoSectionProps = {
  story: StoryInfo;
  titleRef?: Ref<HTMLHeadingElement>;
};

export function StoryInfoSection({ story, titleRef }: StoryInfoSectionProps) {
  const genres = story.genres ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 ref={titleRef} className="text-2xl font-bold">
            {story.title}
          </h1>
          <StoryDetailTags genres={genres} />
        </div>
        <p className="text-base">{story.oneLineIntro}</p>
      </div>

      {story.description && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">주요 내용</h2>
          <TextContent>{story.description}</TextContent>
        </div>
      )}

      {story.startSetting && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">채팅 시작 상황</h2>
          <div className="flex flex-col gap-4">
            {story.startSetting.name && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">상황 이름</h3>
                <TextContent>{story.startSetting.name}</TextContent>
              </div>
            )}
            {story.startSetting.startSituation && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">상황 설명</h3>
                <TextContent>{story.startSetting.startSituation}</TextContent>
              </div>
            )}
            {story.startSetting.prologue && (
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">채팅 첫 메시지</h3>
                <div className="rounded-md bg-muted px-3.5 py-2.5">
                  <TextContent size="sm" font="maruburi">
                    {story.startSetting.prologue}
                  </TextContent>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
