'use client';

import { type ReactNode, useState } from 'react';

import Image from 'next/image';

import { FullscreenImageViewer } from '@/components/common/fullscreen-image-viewer';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

import { isAllowedChatCharacterImageUrl } from '../utils/chat-message-segments';

type ChatCharacterImageProps = {
  /** 대체 텍스트. 버튼·뷰어 이름은 뒤에 "크게 보기"를 붙인다. */
  alt: string;
  imageUrl: string;
  loading?: 'eager' | 'lazy';
  className?: string;
  /** 이미지를 탭해 뷰어가 열릴 때 호출된다(화면별 분석 이벤트용). */
  onZoom?: () => void;
  /** 이미지를 보일 수 없을 때(허용 밖 URL·로드 실패) 대신 렌더한다. 없으면 아무것도 그리지 않는다. */
  fallback?: ReactNode;
};

/**
 * 채팅 본문의 인물, 장면 이미지를 4:3 비율로 보이고 탭하면 전체 화면 뷰어를 여는 컴포넌트.
 * 허용 CDN 밖 URL이거나 로드에 실패하면 `fallback` 을 대신 그린다.
 */
export function ChatCharacterImage({
  alt,
  imageUrl,
  loading = 'lazy',
  className,
  onZoom,
  fallback = null,
}: ChatCharacterImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (hasError || !isAllowedChatCharacterImageUrl(imageUrl)) {
    return fallback;
  }

  return (
    <>
      <button
        type="button"
        aria-label={`${alt} 크게 보기`}
        className={cn('block w-full', className)}
        onClick={() => {
          onZoom?.();
          setIsViewerOpen(true);
        }}>
        <AspectRatio
          ratio={4 / 3}
          data-slot="chat-character-image"
          className="overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes="(max-width: 448px) calc(100vw - 32px), 416px"
            loading={loading}
            className="object-contain"
            onError={() => setHasError(true)}
          />
        </AspectRatio>
      </button>
      <FullscreenImageViewer
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        imageUrl={imageUrl}
        alt={alt}
        title={`${alt} 크게 보기`}
      />
    </>
  );
}
