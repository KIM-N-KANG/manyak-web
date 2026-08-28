'use client';

import { useState } from 'react';

import Image from 'next/image';

import { AspectRatio } from '@/components/ui/aspect-ratio';

import { isAllowedChatCharacterImageUrl } from '../utils/chat-message-segments';

type ChatCharacterImageProps = {
  name: string;
  imageUrl: string;
  loading?: 'eager' | 'lazy';
};

export function ChatCharacterImage({
  name,
  imageUrl,
  loading = 'lazy',
}: ChatCharacterImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !isAllowedChatCharacterImageUrl(imageUrl)) {
    return null;
  }

  return (
    <AspectRatio
      ratio={4 / 3}
      data-slot="chat-character-image"
      className="overflow-hidden rounded-xl border border-border bg-muted">
      <Image
        src={imageUrl}
        alt={`${name} 인물 이미지`}
        fill
        sizes="(max-width: 448px) calc(100vw - 32px), 416px"
        loading={loading}
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </AspectRatio>
  );
}
