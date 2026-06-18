import { TextContent } from '@/components/common/text-content';
import { Label } from '@/components/ui/label';
import { formatStoryDate } from '@/features/stories/list/utils/format-date';

import { MOCK_STORY_DETAIL } from '../mock';
import { StoryDetailCta } from './story-detail-cta';
import { StoryDetailHeader } from './story-detail-header';
import { StoryDetailTags } from './story-detail-tags';

export function StoryDetail() {
  /** @todo 목데이터 사용안할 때 제거해야 함 */
  const story = MOCK_STORY_DETAIL;

  return (
    <div className="flex min-h-svh flex-col">
      <StoryDetailHeader />

      <main className="flex flex-1 flex-col gap-8 p-4 pb-20">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">{story.title}</h1>
            {story.genres.length > 0 && (
              <StoryDetailTags genres={story.genres} />
            )}
          </div>

          <p className="text-base">{story.shortDescription}</p>
        </div>

        {story.detailedIntroduction && (
          <StoryDetailSection title="상세 설명">
            <TextContent>{story.detailedIntroduction}</TextContent>
          </StoryDetailSection>
        )}

        {story.startSituationName && (
          <StoryDetailSection title="시작 상황 이름">
            <TextContent>{story.startSituationName}</TextContent>
          </StoryDetailSection>
        )}

        {story.conversationPrologue && (
          <StoryDetailSection title="시작 상황">
            <TextContent>{story.conversationPrologue}</TextContent>
          </StoryDetailSection>
        )}

        {story.createdAt && (
          <div className="flex items-center justify-between">
            <Label className="text-foreground-secondary">만든 날짜</Label>
            <time className="text-sm">{formatStoryDate(story.createdAt)}</time>
          </div>
        )}
      </main>

      <StoryDetailCta />
    </div>
  );
}

function StoryDetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
