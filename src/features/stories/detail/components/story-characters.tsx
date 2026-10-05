'use client';

import type { StoryCharacterResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ChatCharacterImage } from '@/features/chats/_shared/components/chat-character-image';
import { track } from '@/observability/analytics';

type StoryCharactersProps = {
  storyId: string;
  characters: StoryCharacterResponse[];
};

export function StoryCharacters({ storyId, characters }: StoryCharactersProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">주변 인물</h2>
      <div className="flex flex-col gap-6">
        {characters.map((character, index) => {
          const imageAlt = `${character.name ?? ''} 인물 이미지`;
          // 이미지가 없거나(생성 실패로 null) 보일 수 없으면 스토리 썸네일처럼 기본 심벌을 둔다
          const imageFallback = (
            <AspectRatio
              ratio={4 / 3}
              className="overflow-hidden rounded-xl border border-border bg-muted">
              <div
                role="img"
                aria-label={`${imageAlt} 없음`}
                className="flex size-full items-center justify-center">
                <ManyakSymbolIcon
                  aria-hidden="true"
                  className="size-8 text-foreground-tertiary"
                />
              </div>
            </AspectRatio>
          );

          return (
            <div
              key={`${character.name}-${index}`}
              className="flex flex-col gap-3">
              {character.imageUrl ? (
                <ChatCharacterImage
                  alt={imageAlt}
                  imageUrl={character.imageUrl}
                  fallback={imageFallback}
                  onZoom={() =>
                    track('client_storyDetail_characterImage_clicked', {
                      story_id: storyId,
                    })
                  }
                />
              ) : (
                imageFallback
              )}
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">{character.name}</h3>
                {/* 소개 없이 만든 기존·일반 제작 인물은 description이 null이라 생략한다 */}
                {character.description ? (
                  <TextContent>{character.description}</TextContent>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
