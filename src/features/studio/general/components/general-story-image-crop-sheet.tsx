import { useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { GENERAL_STORY_IMAGE_CROP_COPY } from '@/features/studio/general/constants';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';

const MAX_ZOOM = 3;

type GeneralStoryImageCropSheetProps = {
  /** 고른 원본 이미지의 blob URL이다. */
  imageUrl: string;
  /** 자를 비율(가로/세로)이다. */
  aspect: number;
  onCancel: () => void;
  /** 원본 픽셀 기준으로 고른 영역을 받는다. */
  onConfirm: (area: Area) => void;
};

export function GeneralStoryImageCropSheet({
  imageUrl,
  aspect,
  onCancel,
  onConfirm,
}: GeneralStoryImageCropSheetProps) {
  const container = useAppFrameContainer();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const {
    title,
    zoom: zoomLabel,
    confirm,
    close,
  } = GENERAL_STORY_IMAGE_CROP_COPY;

  return (
    <Drawer
      open={container !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}>
      <DrawerContent container={container}>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        {/* 이미지를 끄는 동작이 시트를 아래로 끌어 닫는 동작으로 이어지지 않게 한다. */}
        <div
          data-base-ui-swipe-ignore
          className="relative mt-3 aspect-square max-h-[60dvh] w-full bg-black">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            maxZoom={MAX_ZOOM}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedAreaPixels) =>
              setArea(croppedAreaPixels)
            }
          />
        </div>
        <div data-base-ui-swipe-ignore className="px-4 pt-4">
          <input
            type="range"
            aria-label={zoomLabel}
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <DrawerFooter className="pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!area}
            onClick={() => area && onConfirm(area)}>
            {confirm}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full text-foreground-secondary"
            onClick={onCancel}>
            {close}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
