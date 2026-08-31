import type { StoryCharacterResponse } from '@/api/generated/models';
import { ChatCharacterImage } from '@/features/chats/_shared/components/chat-character-image';

type StoryCharactersProps = {
  characters: StoryCharacterResponse[];
};

export function StoryCharacters({ characters }: StoryCharactersProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">주변 인물</h2>
      <div className="flex flex-col gap-6">
        {characters.map((character, index) => (
          <div
            key={`${character.name}-${index}`}
            className="flex flex-col gap-4">
            <h3 className="font-semibold">{character.name}</h3>
            {/* 이미지 생성에 실패한 인물은 imageUrl이 null이라 이름만 남긴다 */}
            {character.imageUrl ? (
              <ChatCharacterImage
                name={character.name ?? ''}
                imageUrl={character.imageUrl}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
