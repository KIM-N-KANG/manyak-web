'use client';

import type { StoryCharacterResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
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
        {characters.map((character, index) => (
          <div
            key={`${character.name}-${index}`}
            className="flex flex-col gap-4">
            <h3 className="font-semibold">{character.name}</h3>
            {/* 소개 없이 만든 기존·일반 제작 인물은 description이 null이라 생략한다 */}
            {character.description ? (
              <TextContent>{character.description}</TextContent>
            ) : null}
            {/* 이미지 생성에 실패한 인물은 imageUrl이 null이라 이미지를 생략한다 */}
            {character.imageUrl ? (
              <ChatCharacterImage
                alt={`${character.name ?? ''} 인물 이미지`}
                imageUrl={character.imageUrl}
                onZoom={() =>
                  track('client_storyDetail_characterImage_clicked', {
                    story_id: storyId,
                  })
                }
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
