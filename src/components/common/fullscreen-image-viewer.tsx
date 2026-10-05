'use client';

import { type PointerEvent, useRef, useState } from 'react';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';
import { useCloseOnBack } from '@/hooks/use-close-on-back';
import { isPointInContainedImage } from '@/lib/contained-image';
import {
  gestureImageZoom,
  INITIAL_IMAGE_ZOOM,
  toggleImageZoom,
  type ZoomViewport,
} from '@/lib/image-zoom';
import { cn } from '@/lib/utils';

type FullscreenImageViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  /** 이미지 대체 텍스트. */
  alt: string;
  /** 다이얼로그의 접근 가능한 이름. */
  title: string;
};

export function FullscreenImageViewer({
  open,
  onOpenChange,
  imageUrl,
  alt,
  title,
}: FullscreenImageViewerProps) {
  useCloseOnBack({ open, onClose: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/[0.92]" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed inset-0 z-50 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <DialogPrimitive.Title className="sr-only">
            {title}
          </DialogPrimitive.Title>
          <ZoomableImage
            imageUrl={imageUrl}
            alt={alt}
            onBackdropTap={() => onOpenChange(false)}
          />
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-[calc(.5rem+env(safe-area-inset-top))] right-2 text-white hover:bg-white/10 hover:text-white"
              />
            }>
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">닫기</span>
          </DialogClose>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

type Point = { x: number; y: number };

/**
 * 두 번의 탭을 더블 탭으로 묶는 최대 간격(ms)과 거리(px)다.
 * 풀스크린 뷰어는 이미지 밖 검은 배경·X·뒤로가기로 페이지 이동 없이 닫힌다. 이미지는 화면 전체 박스에 contain으로 그려
 * 박스가 여백까지 덮으므로, 탭 지점이 실제 그림 밖일 때만 배경 탭으로 닫는다.
 * Android 뷰어와 같이 이미지를 더블 탭하면 누른 지점 기준 2.5배로 키우고 다시 더블 탭하면 되돌리며,
 * 두 손가락으로 1~5배 확대하고 확대 중에는 끌어서 옮긴다. 브라우저 기본 확대·스크롤은 `touch-action: none`으로 막고,
 * 뷰어가 닫히면 이미지가 언마운트돼 확대 상태가 초기화된다.
 */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;

/** 이 거리(px)보다 많이 움직인 포인터는 탭이 아니라 끌기·핀치로 본다. */
const DRAG_SLOP = 8;

/**
 * 요소의 화면 박스를 확대 영역으로 바꾼다.
 *
 * @param element 확대 영역 요소
 * @returns 크기와 화면 좌표 중심
 */
const viewportOf = (element: HTMLElement): ZoomViewport => {
  const rect = element.getBoundingClientRect();

  return {
    width: rect.width,
    height: rect.height,
    center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
  };
};

type ZoomableImageProps = {
  imageUrl: string;
  alt: string;
  onBackdropTap: () => void;
};

function ZoomableImage({ imageUrl, alt, onBackdropTap }: ZoomableImageProps) {
  const [zoom, setZoom] = useState(INITIAL_IMAGE_ZOOM);
  const [isGesturing, setIsGesturing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<{ zoom: typeof zoom; points: Point[] } | null>(
    null,
  );
  const draggedRef = useRef(false);
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);

  const restartGesture = () => {
    gestureRef.current = {
      zoom,
      points: [...pointersRef.current.values()].slice(0, 2),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.size === 0) draggedRef.current = false;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    restartGesture();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;

    if (!gesture || !pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const points = [...pointersRef.current.values()].slice(0, 2);

    if (
      !draggedRef.current &&
      points.some((point, index) => {
        const start = gesture.points[index];

        return (
          start && Math.hypot(point.x - start.x, point.y - start.y) > DRAG_SLOP
        );
      })
    ) {
      draggedRef.current = true;
    }

    if (!draggedRef.current) return;

    setIsGesturing(true);
    setZoom(
      gestureImageZoom({
        start: gesture.zoom,
        startPoints: gesture.points,
        points,
        viewport: viewportOf(event.currentTarget),
      }),
    );
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);

    if (pointersRef.current.size > 0) {
      restartGesture();

      return;
    }

    gestureRef.current = null;
    setIsGesturing(false);
  };

  return (
    <div
      className="absolute inset-0 touch-none overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={(event) => {
        if (draggedRef.current) return;

        const point = { x: event.clientX, y: event.clientY };
        const image = imageRef.current;
        const isOnImage =
          image !== null &&
          isPointInContainedImage({
            box: image.getBoundingClientRect(),
            natural: { width: image.naturalWidth, height: image.naturalHeight },
            point,
          });

        if (!isOnImage) {
          onBackdropTap();

          return;
        }

        const lastTap = lastTapRef.current;

        if (
          lastTap &&
          event.timeStamp - lastTap.time < DOUBLE_TAP_MS &&
          Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) <
            DOUBLE_TAP_SLOP
        ) {
          lastTapRef.current = null;
          setZoom(
            toggleImageZoom(zoom, point, viewportOf(event.currentTarget)),
          );

          return;
        }

        lastTapRef.current = { time: event.timeStamp, point };
      }}>
      <div
        className={cn(
          'absolute inset-0 motion-reduce:transition-none',
          !isGesturing && 'transition-transform duration-200 ease-out',
        )}
        style={{
          transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
        }}>
        <Image
          ref={imageRef}
          src={imageUrl}
          alt={alt}
          fill
          sizes="100vw"
          draggable={false}
          className="object-contain"
        />
      </div>
    </div>
  );
}
