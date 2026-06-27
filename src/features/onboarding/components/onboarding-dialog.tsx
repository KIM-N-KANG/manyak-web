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
    <Dialog
      open={open}
      onOpenChange={() => {
        // 환영 다이얼로그는 '스토리 만들기' 버튼으로만 벗어날 수 있다.
        // ESC·바깥 클릭 등 외부 dismiss 요청은 무시한다.
      }}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'inset-0 top-0 left-0 h-full max-h-none w-full max-w-none translate-x-0 translate-y-0 rounded-none ring-0',
          'flex flex-col gap-0 p-0',
        )}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-6 pt-16 pb-6">
          <DialogHeader className="gap-3">
            <DialogTitle className="text-2xl font-bold">
              환영해요 👋
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              키워드를 골라 나만의 이야기를 만들고, 직접 주인공이 되어 대화하며
              이야기를 이어가는 곳이에요.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 rounded-xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
            지금은{' '}
            <strong className="font-semibold text-foreground">알파 버전</strong>
            이에요. 만든 스토리와 채팅은{' '}
            <strong className="font-semibold text-foreground">
              이 브라우저에만
            </strong>{' '}
            저장돼요. 브라우저를 바꾸거나 방문 기록을 지우면 다시 만들어야 해요.
          </div>
        </div>

        <div className="mx-auto w-full max-w-md px-6 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
