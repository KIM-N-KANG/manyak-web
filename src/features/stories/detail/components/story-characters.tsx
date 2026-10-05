'use client';

import { useRef, useState } from 'react';

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

import type { StoryCharacterResponse } from '@/api/generated/models';
import { TextContent } from '@/components/common/text-content';
import { ManyakSymbolIcon } from '@/components/icons/manyak-symbol-icon';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ChatCharacterImage } from '@/features/chats/_shared/components/chat-character-image';
import { isAllowedChatCharacterImageUrl } from '@/features/chats/_shared/utils/chat-message-segments';
import { useDragScroll } from '@/hooks/use-drag-scroll';
import { cn } from '@/lib/utils';
import { track } from '@/observability/analytics';

const ARROW_CLASS_NAME =
  'absolute top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

type StoryCharactersProps = {
  storyId: string;
  characters: StoryCharacterResponse[];
};

function CharacterImageFallback({ label }: { label?: string }) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      className="flex size-full items-center justify-center bg-muted">
      <ManyakSymbolIcon
        aria-hidden="true"
        className="size-8 text-foreground-tertiary"
      />
    </div>
  );
}

function CharacterThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const [hasError, setHasError] = useState(false);

  if (!imageUrl || hasError || !isAllowedChatCharacterImageUrl(imageUrl)) {
    return <CharacterImageFallback />;
  }

  return (
    <Image
      src={imageUrl}
      alt=""
      fill
      sizes="120px"
      className="object-cover"
      onError={() => setHasError(true)}
    />
  );
}

export function StoryCharacters({ storyId, characters }: StoryCharactersProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dragScrollProps = useDragScroll();
  const selected = characters[selectedIndex] ?? characters[0];
  const hasPicker = characters.length > 1;
  const imageAlt = `${selected.name ?? ''} 인물 이미지`;
  const imageFallback = (
    <AspectRatio ratio={4 / 3}>
      <CharacterImageFallback label={`${imageAlt} 없음`} />
    </AspectRatio>
  );

  const selectCharacter = (index: number) => {
    setSelectedIndex(index);
    pickerRef.current?.children[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">주변 인물</h2>
      <div className="flex flex-col gap-1.5">
        {hasPicker ? (
          <div
            ref={pickerRef}
            {...dragScrollProps}
            role="group"
            aria-label="주변 인물 선택"
            className="-mx-4 scrollbar-none flex scroll-fade-x scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 py-0.5">
            {characters.map((character, index) => (
              <button
                key={`${character.name}-${index}`}
                type="button"
                aria-label={character.name}
                aria-pressed={index === selectedIndex}
                className={cn(
                  'w-[calc((100%-1.5rem)/3.5)] shrink-0 rounded-lg opacity-50 transition-opacity outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === selectedIndex &&
                    'opacity-100 ring-2 ring-foreground focus-visible:ring-2 focus-visible:ring-foreground',
                )}
                onClick={() => selectCharacter(index)}>
                <AspectRatio
                  ratio={4 / 3}
                  className="overflow-hidden rounded-lg border border-border">
                  <CharacterThumbnail imageUrl={character.imageUrl} />
                </AspectRatio>
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative **:data-[slot=chat-character-image]:rounded-none **:data-[slot=chat-character-image]:border-0">
            {selected.imageUrl ? (
              <ChatCharacterImage
                key={selectedIndex}
                alt={imageAlt}
                imageUrl={selected.imageUrl}
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
            {hasPicker && selectedIndex > 0 ? (
              <button
                type="button"
                aria-label="이전 인물"
                className={cn(ARROW_CLASS_NAME, 'left-2')}
                onClick={() => selectCharacter(selectedIndex - 1)}>
                <HugeiconsIcon
                  icon={ArrowLeft01Icon}
                  className="size-5"
                  aria-hidden="true"
                />
              </button>
            ) : null}
            {hasPicker && selectedIndex < characters.length - 1 ? (
              <button
                type="button"
                aria-label="다음 인물"
                className={cn(ARROW_CLASS_NAME, 'right-2')}
                onClick={() => selectCharacter(selectedIndex + 1)}>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-5"
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </div>
          <div className="border-t border-border px-4 py-3.5 break-keep">
            <h3 className="leading-6 font-semibold">{selected.name}</h3>
            {/* 소개 없이 만든 기존·일반 제작 인물은 description이 null이라 생략한다 */}
            {selected.description ? (
              <div className="mt-1">
                <TextContent size="sm">{selected.description}</TextContent>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
