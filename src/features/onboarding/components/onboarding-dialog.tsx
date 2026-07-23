'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useOnboardingDialog } from '../hooks/use-onboarding-dialog';

export function OnboardingDialog() {
  const { isOpen, handleStartCreate, handleSkip } = useOnboardingDialog();

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        size="sm"
        overlayClassName="duration-500"
        className="duration-500 ease-out">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            키워드 몇 개로, 나만의 스토리 완성
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-relaxed text-foreground">
            복잡한 설정 없이 스토리를 만들고 AI와 채팅하며 나만의 전개를
            이어가보세요
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid-cols-1">
          <AlertDialogAction onClick={handleStartCreate}>
            첫 스토리 만들기
          </AlertDialogAction>
          <AlertDialogAction
            type="button"
            variant="ghost"
            size="sm"
            className="text-foreground-tertiary hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
            onClick={handleSkip}>
            나중에 하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
