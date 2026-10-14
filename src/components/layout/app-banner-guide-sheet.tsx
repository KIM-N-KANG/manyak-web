'use client';

import Image from 'next/image';
import { toast } from 'sonner';

import { SnapStrip } from '@/components/common/snap-strip';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { APP_BANNER_COPY } from '@/constants/app-banner';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';

/** 배너가 여는 안내 시트 종류다. 홈 화면 추가는 스크린샷과 텍스트 두 가지다. */
export type AppBannerGuide = 'homeScreenImages' | 'homeScreenText' | 'escape';

type AppBannerGuideSheetProps = {
  guide: AppBannerGuide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * 현재 주소를 클립보드에 복사하고 결과를 토스트로 알린다.
 *
 * @returns 복사가 끝나면 이행되는 Promise
 */
async function copyCurrentUrl(): Promise<void> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(APP_BANNER_COPY.escapeGuide.linkCopied);
  } catch {
    toast.error(APP_BANNER_COPY.escapeGuide.linkCopyFailed);
  }
}

/**
 * 단계 번호 배지의 클래스다.
 */
const STEP_NUMBER_CLASS =
  'flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary';

export function AppBannerGuideSheet({
  guide,
  open,
  onOpenChange,
}: AppBannerGuideSheetProps) {
  const container = useAppFrameContainer();
  const { homeScreenGuide, escapeGuide } = APP_BANNER_COPY;

  return (
    <Drawer open={open && container !== null} onOpenChange={onOpenChange}>
      <DrawerContent container={container}>
        <DrawerHeader className="gap-2 px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle className="text-xl leading-snug font-bold">
            {guide === 'escape' ? escapeGuide.title : homeScreenGuide.title}
          </DrawerTitle>
          {guide === 'escape' && (
            <DrawerDescription className="text-sm text-foreground-secondary">
              {escapeGuide.description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {guide === 'escape' && (
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void copyCurrentUrl()}>
              {escapeGuide.copyLink}
            </Button>
          )}
          {guide === 'homeScreenImages' && (
            <div data-base-ui-swipe-ignore>
              <SnapStrip>
                {homeScreenGuide.imageSteps.map((step, index) => (
                  <figure key={step.src} className="flex flex-col gap-2">
                    <Image
                      src={step.src}
                      alt={step.alt}
                      width={640}
                      height={640}
                      unoptimized
                      className="aspect-square w-full rounded-xl border border-border object-cover"
                    />
                    <figcaption className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className={STEP_NUMBER_CLASS}>{index + 1}</span>
                      {step.label}
                    </figcaption>
                  </figure>
                ))}
              </SnapStrip>
            </div>
          )}
          {guide === 'homeScreenText' && (
            <>
              <ol className="flex flex-col gap-3">
                {homeScreenGuide.textSteps.map((step, index) => (
                  <li
                    key={step}
                    className="flex items-center gap-3 text-base font-medium text-foreground">
                    <span className={STEP_NUMBER_CLASS}>{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-sm text-foreground-secondary">
                {homeScreenGuide.textHint}
              </p>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
