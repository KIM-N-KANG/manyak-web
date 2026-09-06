import type { Ref } from 'react';

import type {
  StoryAuthorResponse,
  StoryCharacterResponse,
  StoryStartSettingResponse,
} from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { formatDate } from '@/lib/format-date';

import { StoryCharacters } from './story-characters';
import { StoryDetailTags } from './story-detail-tags';
import { StoryStartSettings } from './story-start-settings';

type StoryInfo = {
  title?: string;
  oneLineIntro?: string | null;
  description?: string | null;
  genres?: string[];
  author?: StoryAuthorResponse | null;
  characters?: StoryCharacterResponse[];
  reachedEndings?: string[];
  startSettings?: StoryStartSettingResponse[];
  createdAt?: string;
};

type StoryInfoSectionProps = {
  story: StoryInfo;
  titleRef?: Ref<HTMLHeadingElement>;
  metadataRef?: Ref<HTMLDivElement>;
  startSettingValue: string;
  onStartSettingValueChange: (value: string) => void;
};

export function StoryInfoSection({
  story,
  titleRef,
  metadataRef,
  startSettingValue,
  onStartSettingValueChange,
}: StoryInfoSectionProps) {
  const genres = story.genres ?? [];
  const reachedEndings = story.reachedEndings ?? [];
  const characters = (story.characters ?? []).filter((character) =>
    Boolean(character.name),
  );
  const startSettings = story.startSettings ?? [];
  const authorNickname = story.author?.nickname;

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

      {characters.length > 0 && <StoryCharacters characters={characters} />}

      {startSettings.length > 0 && (
        <StoryStartSettings
          startSettings={startSettings}
          value={startSettingValue}
          onValueChange={onStartSettingValueChange}
        />
      )}

      {(authorNickname || story.createdAt) && (
        <div
          ref={metadataRef}
          className="-mx-4 flex flex-col gap-4 bg-muted p-4 text-sm text-foreground-secondary">
          {authorNickname && (
            <div className="flex items-center justify-between">
              <span className="font-semibold">제작자</span>
              <span>{authorNickname}</span>
            </div>
          )}
          {story.createdAt && (
            <div className="flex items-center justify-between">
              <span className="font-semibold">생성일</span>
              <time dateTime={story.createdAt}>
                {formatDate(story.createdAt)}
              </time>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
