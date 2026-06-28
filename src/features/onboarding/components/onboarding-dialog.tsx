'use client';

import { useRef } from 'react';

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
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        initialFocus={contentRef}
        className={cn(
          'top-0 left-1/2 h-full max-h-none w-full max-w-md -translate-x-1/2 translate-y-0 rounded-none ring-0',
          'flex flex-col gap-0 p-0',
        )}>
        <div
          ref={contentRef}
          tabIndex={-1}
          className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pt-26 pb-4 outline-none">
          <DialogHeader className="gap-4">
            <DialogTitle className="text-2xl font-bold">
              나만의 스토리, 바로 만들어볼까요?
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              키워드 몇 개를 고르면 AI가 스토리라인을 만들어드려요. 마음에 드는
              스토리라인을 골라 채팅으로 바로 이어갈 수 있습니다.
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
            첫 스토리 만들기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
