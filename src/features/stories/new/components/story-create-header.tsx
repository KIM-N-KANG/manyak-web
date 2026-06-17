'use client';

import { useState } from 'react';

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type StoryCreateHeaderProps = {
  requiresBackConfirmation?: boolean;
};

export function StoryCreateHeader({
  requiresBackConfirmation = false,
}: StoryCreateHeaderProps) {
  const router = useRouter();
  const [confirmBackDialogOpen, setConfirmBackDialogOpen] = useState(false);

  const handleBackClick = () => {
    if (requiresBackConfirmation) {
      setConfirmBackDialogOpen(true);

      return;
    }

    router.back();
  };

  const handleConfirmBack = () => {
    setConfirmBackDialogOpen(false);
    router.back();
  };

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center bg-background pr-4 pl-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-lg"
            variant="ghost"
            aria-label="이전 페이지로 돌아가기 버튼"
            onClick={handleBackClick}>
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
          </Button>
          <h1 className="text-lg font-semibold">스토리 만들기</h1>
        </div>
      </header>
      <Dialog
        open={confirmBackDialogOpen}
        onOpenChange={setConfirmBackDialogOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>스토리 만들기를 그만할까요?</DialogTitle>
            <DialogDescription>
              지금 나가면 만들고 있는 내용이 사라져요
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="secondary">
                  계속 만들기
                </Button>
              }
            />
            <Button type="button" onClick={handleConfirmBack}>
              나가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
