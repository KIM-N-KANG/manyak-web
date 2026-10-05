'use client';

import { useRef } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { cn } from '@/lib/utils';

export const DRAFT_SAVE_BUTTON_LABEL = '임시 저장';

/** 임시 저장 결과 토스트의 id다. 같은 id로 다시 띄우면 이전 토스트를 대신한다. */
export const DRAFT_SAVE_TOAST_ID = 'story-draft-save';

/** 저장 완료 토스트를 띄워 두는 시간이다. 위쪽 토스트가 헤더의 저장·닫기 버튼을 오래 가리지 않게 짧게 둔다. */
export const DRAFT_SAVED_TOAST_DURATION_MS = 1500;

/** 임시 저장 버튼 연타를 막는 간격이다. 첫 누름은 바로 저장하고 이 간격 안의 누름은 버린다. */
const DRAFT_SAVE_CLICK_THROTTLE_MS = 1000;

type DraftSaveButtonProps = {
  isSaving: boolean;
  disabled: boolean;
  /** 지금 입력이 마지막 임시 저장본과 같은지. 같으면 다시 쓰지 않고 저장 토스트만 띄운다. */
  isSaved: boolean;
  /** 임시 저장하고 성공 여부를 돌려준다. 실패 안내는 호출부가 맡는다. */
  onSave: () => Promise<boolean>;
};

export function DraftSaveButton({
  isSaving,
  disabled,
  isSaved,
  onSave,
}: DraftSaveButtonProps) {
  const lastClickAtRef = useRef(0);

  const handleClick = async () => {
    const now = Date.now();

    if (isSaving || now - lastClickAtRef.current < DRAFT_SAVE_CLICK_THROTTLE_MS)
      return;

    lastClickAtRef.current = now;

    if (isSaved || (await onSave())) {
      toast.success(TOAST_MESSAGE.STORY_DRAFT_SAVED, {
        id: DRAFT_SAVE_TOAST_ID,
        duration: DRAFT_SAVED_TOAST_DURATION_MS,
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || isSaving}
      onClick={handleClick}
      className={cn('relative', isSaving && 'disabled:opacity-100')}>
      <span className={cn(isSaving && 'invisible')}>
        {DRAFT_SAVE_BUTTON_LABEL}
      </span>
      {isSaving && <Spinner className="absolute" />}
    </Button>
  );
}
