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
  const { isOpen, handleStartCreate } = useOnboardingDialog();

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        overlayClassName="duration-500"
        className="duration-500 ease-out data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>나만의 스토리, 바로 만들어볼까요?</AlertDialogTitle>
          <AlertDialogDescription>
            키워드 몇 개를 고르면 AI가 스토리라인을 만들어드려요. 마음에 드는
            스토리라인을 골라 채팅으로 바로 이어갈 수 있습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg bg-muted px-4 py-3">
          지금은 <strong className="font-semibold">알파 버전</strong>
          이에요. 만든 스토리와 채팅은{' '}
          <strong className="font-semibold">이 브라우저에만</strong> 저장되어,
          브라우저를 바꾸거나 방문 기록을 지우면 다시 만들어야 합니다.
        </div>

        <AlertDialogFooter>
          <AlertDialogAction className="w-full" onClick={handleStartCreate}>
            첫 스토리 만들기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
