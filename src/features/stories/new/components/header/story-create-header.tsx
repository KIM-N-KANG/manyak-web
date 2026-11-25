import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@/components/ui/button';
import { DraftSaveButton } from '@/features/stories/_shared/components/draft-save-button';
import type { DraftExitDialog } from '@/features/stories/_shared/constants/draft-exit-warning';

import type { StoryCreateStep } from '../../types';
import { StoryCreateStepIndicator } from '../step-layout/story-create-step-indicator';
import { StoryCreateBackDialog } from './story-create-back-dialog';

type StoryCreateHeaderProps = {
  step: StoryCreateStep;
  isSavingDraft: boolean;
  /** 저장할 입력이 있고 생성이나 완성 요청 중이 아닌지. 거짓이면 저장 버튼을 막는다. */
  canSaveDraft: boolean;
  /** 지금 입력이 마지막 저장본과 같은지. 같으면 저장 버튼이 다시 쓰지 않고 완료 토스트만 띄운다. */
  isDraftSaved: boolean;
  /** 임시 저장하고 성공 여부를 돌려준다. 실패 안내는 퍼널이 맡는다. */
  onSaveDraft: () => Promise<boolean>;
  /** 열어 둘 이탈 확인 다이얼로그의 문구 종류. null이면 닫혀 있다. */
  backDialog: DraftExitDialog | null;
  /** 닫기 버튼. 잃을 입력이 있으면 퍼널이 다이얼로그를 열고, 없으면 바로 나간다. */
  onBackClick: () => void;
  onBackDialogOpenChange: (open: boolean) => void;
  /** 다이얼로그에서 나가기를 확정한다. 저장하지 않고 퍼널을 떠난다. */
  onConfirmBack: () => void;
};

export function StoryCreateHeader({
  step,
  isSavingDraft,
  canSaveDraft,
  isDraftSaved,
  onSaveDraft,
  backDialog,
  onBackClick,
  onBackDialogOpenChange,
  onConfirmBack,
}: StoryCreateHeaderProps) {
  return (
    <>
      <header className="flex shrink-0 flex-col bg-background">
        <div className="flex h-14 items-center gap-2 px-4">
          <h1 className="font-semibold">스토리 간편 제작</h1>
          {/* 닫기 아이콘 글리프를 다른 헤더와 같은 오른쪽 16px에 맞추려고 버튼 여백만큼 당긴다. */}
          <div className="-mr-2.5 ml-auto flex items-center gap-1">
            <DraftSaveButton
              isSaving={isSavingDraft}
              disabled={!canSaveDraft}
              isSaved={isDraftSaved}
              onSave={onSaveDraft}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="스토리 만들기 닫기"
              onClick={onBackClick}>
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-4">
          <StoryCreateStepIndicator step={step} />
        </div>
      </header>
      <StoryCreateBackDialog
        variant={backDialog}
        onOpenChange={onBackDialogOpenChange}
        onConfirm={onConfirmBack}
      />
    </>
  );
}
