'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useOnboardingDialog } from '../hooks/use-onboarding-dialog';

export function OnboardingDialog() {
  const { open, handleStartCreate } = useOnboardingDialog();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'top-0 left-1/2 h-full max-h-none w-full max-w-md -translate-x-1/2 translate-y-0 rounded-none ring-0',
          'flex flex-col gap-0 p-0',
        )}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pt-26 pb-4">
          <DialogHeader className="gap-4">
            <DialogTitle className="text-2xl font-bold">
              마냑에 오신걸 환영해요 👋
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              키워드를 골라 나만의 스토리를 만들고, 스토리 속 주인공이 되어 AI와
              채팅하며 스토리를 이어가는 곳이에요
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 rounded-lg bg-muted px-4 py-3 text-base text-foreground-secondary">
            지금은{' '}
            <strong className="font-semibold text-foreground">알파 버전</strong>
            이에요. 만든 스토리와 채팅은{' '}
            <strong className="font-semibold text-foreground">
              이 브라우저에만
            </strong>{' '}
            저장돼요. 브라우저를 바꾸거나 방문 기록을 지우면 다시 만들어야 해요.
          </div>
        </div>

        <div className="mx-auto w-full max-w-md px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleStartCreate}>
            스토리 만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
