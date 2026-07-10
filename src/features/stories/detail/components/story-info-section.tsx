import type { Ref } from 'react';

import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';

import { StoryDetailTags } from './story-detail-tags';

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
};

export function StoryInfoSection({ story, titleRef }: StoryInfoSectionProps) {
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
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">채팅 시작 상황</h2>
          <div className="flex flex-col gap-8">
            {startSettings.map((startSetting, index) => (
              <div
                key={startSetting.id ?? index}
                className="flex flex-col gap-4">
                {startSetting.name && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">상황 이름</h3>
                    <TextContent>{startSetting.name}</TextContent>
                  </div>
                )}
                {startSetting.startSituation && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">상황 설명</h3>
                    <TextContent>{startSetting.startSituation}</TextContent>
                  </div>
                )}
                {startSetting.prologue && (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold">채팅 첫 메시지</h3>
                    <div className="rounded-md bg-muted px-3.5 py-2.5">
                      <TextContent size="sm" font="maruburi">
                        {startSetting.prologue}
                      </TextContent>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
