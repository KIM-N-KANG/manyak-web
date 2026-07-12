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

import { GUEST_LIMITS } from '../constants';
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
          <AlertDialogDescription className="leading-relaxed">
            키워드를 고르면 AI가 스토리라인을 만들어드려요. <br />
            마음에 드는 스토리라인을 골라 스토리를 만들고 채팅을 하며 나만의
            스토리로 만들어갈 수 있어요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <div className="rounded-lg bg-muted px-4 py-3">
            <strong className="font-semibold">게스트로 이용하면</strong>{' '}
            스토리라인 생성 {GUEST_LIMITS.storylineCreate}회, 스토리 생성{' '}
            {GUEST_LIMITS.storyCreate}회, 채팅 {GUEST_LIMITS.chat}회까지만
            이용할 수 있어요. 또한 이 브라우저에만 저장되어 기기나 브라우저를
            바꾸면 사라져요.
          </div>
          <div className="rounded-lg bg-muted px-4 py-3">
            <strong className="font-semibold">로그인을 하면</strong> 크레딧이
            차감되는 대신 횟수 제한 없이 이용할 수 있으며, 서버에 저장되어 어떤
            기기에서든 이어서 즐길 수 있어요.
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            className="col-span-full"
            onClick={handleStartCreate}>
            첫 스토리 만들기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
