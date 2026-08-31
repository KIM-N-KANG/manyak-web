'use client';

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

import { useCloseOnBack } from '../hooks/use-close-on-back';

type StoryThumbnailViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
};

export function StoryThumbnailViewer({
  open,
  onOpenChange,
  imageUrl,
}: StoryThumbnailViewerProps) {
  useCloseOnBack({ open, onClose: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/[0.92]" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="fixed inset-0 z-50 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          onClick={() => onOpenChange(false)}>
          <DialogPrimitive.Title className="sr-only">
            스토리 썸네일 크게 보기
          </DialogPrimitive.Title>
          <Image
            src={imageUrl}
            alt="스토리 썸네일"
            fill
            sizes="100vw"
            className="object-contain"
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
