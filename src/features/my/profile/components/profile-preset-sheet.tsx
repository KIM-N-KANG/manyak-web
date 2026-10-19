'use client';

import Image from 'next/image';

import { useListPresets } from '@/api/generated/endpoints/users/users';
import type { ProfilePresetResponse } from '@/api/generated/models';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { cn } from '@/lib/utils';

import { PROFILE_PRESET_SHEET_COPY } from '../constants';

/** 서버 프리셋 수. 조회 중 골격 칸 수로만 쓴다. */
const PRESET_COUNT = 40;

type ProfilePresetSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 선택 표시를 둘 프리셋 이미지 URL */
  selectedImageUrl: string | null;
  onSelect: (preset: ProfilePresetResponse) => void;
};

export function ProfilePresetSheet({
  open,
  onOpenChange,
  selectedImageUrl,
  onSelect,
}: ProfilePresetSheetProps) {
  const container = useAppFrameContainer();
  const { data, isPending, isError, refetch } = useListPresets({
    query: { enabled: open },
  });
  const presets = data?.status === 200 ? data.data : [];

  return (
    <Drawer open={open && container !== null} onOpenChange={onOpenChange}>
      <DrawerContent container={container}>
        <DrawerHeader className="px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-lg font-semibold">
            {PROFILE_PRESET_SHEET_COPY.title}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {isError ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-foreground-secondary">
                {PROFILE_PRESET_SHEET_COPY.loadFailed}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refetch()}>
                {PROFILE_PRESET_SHEET_COPY.retry}
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-4 gap-3">
              {isPending
                ? Array.from({ length: PRESET_COUNT }, (_, index) => (
                    <li key={index}>
                      <Skeleton className="aspect-square w-full rounded-full" />
                    </li>
                  ))
                : presets.map((preset) => {
                    const isSelected =
                      preset.imageUrl !== undefined &&
                      preset.imageUrl === selectedImageUrl;

                    return (
                      <li key={preset.key}>
                        <button
                          type="button"
                          aria-label={preset.key}
                          aria-pressed={isSelected}
                          className={cn(
                            'block aspect-square w-full overflow-hidden rounded-full bg-muted ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected && 'ring-2 ring-primary',
                          )}
                          onClick={() => onSelect(preset)}>
                          {preset.imageUrl && (
                            <Image
                              src={preset.imageUrl}
                              alt=""
                              width={80}
                              height={80}
                              sizes="80px"
                              placeholder={
                                preset.thumbnailBase64 ? 'blur' : 'empty'
                              }
                              blurDataURL={
                                preset.thumbnailBase64
                                  ? `data:image/png;base64,${preset.thumbnailBase64}`
                                  : undefined
                              }
                              className="size-full object-cover"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
            </ul>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
