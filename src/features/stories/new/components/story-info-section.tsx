import type { StoryStartSettingResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { Label } from '@/components/ui/label';
import { StoryDetailTags } from '@/features/stories/detail/components/story-detail-tags';

type StoryInfo = {
  title?: string;
  oneLineIntro?: string | null;
  description?: string | null;
  genres?: string[];
  startSetting?: StoryStartSettingResponse | null;
};

type StoryInfoSectionProps = {
  story: StoryInfo;
};

export function StoryInfoSection({ story }: StoryInfoSectionProps) {
  const genres = story.genres ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{story.title}</h1>
          <StoryDetailTags genres={genres} />
        </div>
        <p className="text-base">{story.oneLineIntro}</p>
      </div>

      {story.description && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">상세 설명</h2>
          <TextContent>{story.description}</TextContent>
        </div>
      )}

      {story.startSetting && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">시작 상황</h2>
          <div className="flex flex-col gap-4">
            {story.startSetting.name && (
              <div className="flex flex-col gap-2">
                <Label>상황 이름</Label>
                <div className="rounded-md bg-muted px-3.5 py-2.5">
                  <TextContent size="sm">{story.startSetting.name}</TextContent>
                </div>
              </div>
            )}
            {story.startSetting.startSituation && (
              <div className="flex flex-col gap-2">
                <Label>상황 설명</Label>
                <div className="rounded-md bg-muted px-3.5 py-2.5">
                  <TextContent size="sm">
                    {story.startSetting.startSituation}
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
