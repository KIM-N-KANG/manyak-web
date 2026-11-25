import type { Ref } from 'react';

import type {
  StoryAuthorResponse,
  StoryCharacterResponse,
  StoryDetailResponseVisibility,
  StoryStartSettingResponse,
} from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { STORY_VISIBILITY_COPY } from '@/features/stories/_shared/constants/story-visibility';
import { formatDate } from '@/lib/format-date';

import { StoryCharacters } from './story-characters';
import { StoryDetailTags } from './story-detail-tags';
import { StoryStartSettings } from './story-start-settings';

/**
 * 상세 본문이 그리는 스토리 필드. 서버가 미리 받은 공개 상세와 브라우저 조회 응답을 모두 받도록 쓰는 필드만
 * 선택값으로 둔다.
 */
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
  /** 참일 때만 공개 범위를 보인다. */
  isOwner?: boolean;
  visibility?: StoryDetailResponseVisibility;
};

type StoryInfoSectionProps = {
  storyId: string;
  story: StoryInfo;
  /** 제목 요소. 상세가 제목이 헤더 뒤로 갔는지 판정해 헤더 제목을 띄우는 데 쓴다. */
  titleRef?: Ref<HTMLHeadingElement>;
  /** 본문 끝 메타 정보 영역. 스크롤 끝에서 하단 버튼 줄 배경을 이 영역 색으로 잇는 데 쓴다. 보일 정보가 없으면 붙지 않는다. */
  metadataRef?: Ref<HTMLDivElement>;
  /** 고른 시작 설정의 Select 값. 채팅 시작 시트와 같은 상태다. */
  startSettingValue: string;
  onStartSettingValueChange: (value: string) => void;
  personaId: string | null;
  onPersonaIdChange: (personaId: string | null) => void;
};

/** 스토리 상세 본문. 공개 범위는 소유자에게만 보인다. */
export function StoryInfoSection({
  storyId,
  story,
  titleRef,
  metadataRef,
  startSettingValue,
  onStartSettingValueChange,
  personaId,
  onPersonaIdChange,
}: StoryInfoSectionProps) {
  const genres = story.genres ?? [];
  const reachedEndings = story.reachedEndings ?? [];
  const characters = (story.characters ?? []).filter((character) =>
    Boolean(character.name),
  );
  const startSettings = story.startSettings ?? [];
  const authorNickname = story.author?.nickname;
  const visibilityLabel =
    story.isOwner && story.visibility
      ? STORY_VISIBILITY_COPY[story.visibility]
      : undefined;

  return (
    <div className="flex flex-col gap-4">
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
            storyId={storyId}
            startSettings={startSettings}
            value={startSettingValue}
            onValueChange={onStartSettingValueChange}
            personaId={personaId}
            onPersonaIdChange={onPersonaIdChange}
          />
        )}

        {characters.length > 0 && (
          <StoryCharacters storyId={storyId} characters={characters} />
        )}
      </div>

      {(authorNickname || story.createdAt || visibilityLabel) && (
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
          {visibilityLabel && (
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {STORY_VISIBILITY_COPY.label}
              </span>
              <span>{visibilityLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
