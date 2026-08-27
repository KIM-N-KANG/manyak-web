'use client';

import { CreditShortageDialog } from '@/components/common/credit-shortage-dialog';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import { LoginRequiredDialog } from '@/features/auth/_shared/components/login-required-dialog';

import { useStartChat } from '../hooks/use-start-chat';

type StoryDetailCtaProps = {
  storyId: string;
  /** 선택한 시작 설정 ID. 없으면 백엔드가 첫 시작 설정을 사용한다. */
  startSettingId?: string;
};

export function StoryDetailCta({
  storyId,
  startSettingId,
}: StoryDetailCtaProps) {
  const {
    startChat,
    isStarting,
    guestLimitTrigger,
    closeGuestLimitDialog,
    creditShortageTrigger,
    closeCreditShortageDialog,
  } = useStartChat(storyId, startSettingId);

  return (
    <>
      <nav className="shrink-0 bg-background px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex w-full items-center">
          <Button
            type="button"
            size="lg"
            className="relative w-full"
            aria-busy={isStarting}
            disabled={isStarting}
            onClick={startChat}>
            <LoadingButtonContent
              isLoading={isStarting}
              loadingLabel="새 채팅 시작 중">
              새 채팅 시작하기
            </LoadingButtonContent>
          </Button>
        </div>
      </nav>
      <LoginRequiredDialog
        trigger={guestLimitTrigger}
        onOpenChange={(open) => {
          if (!open) {
            closeGuestLimitDialog();
          }
        }}
      />
      <CreditShortageDialog
        trigger={creditShortageTrigger}
        onOpenChange={(open) => {
          if (!open) {
            closeCreditShortageDialog();
          }
        }}
      />
    </>
  );
}
