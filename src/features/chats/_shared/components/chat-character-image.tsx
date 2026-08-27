'use client';

import { useState } from 'react';

import Image from 'next/image';

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

  if (hasError) {
    return null;
  }

  return (
    <div
      data-slot="chat-character-image"
      className="relative box-content aspect-4/3 w-full overflow-hidden border-y border-border bg-muted">
      <Image
        src={imageUrl}
        alt={`${name} 인물 이미지`}
        fill
        sizes="(max-width: 448px) 100vw, 448px"
        loading={loading}
        className="object-contain"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
