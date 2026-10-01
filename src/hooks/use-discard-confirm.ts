import { useState } from 'react';

/** 입력한 내용이 있는 항목을 지우기 전에 묻는 확인 문구다(채팅 블록 입력과 제작 목록 공통). */
export const DISCARD_INPUT_CONFIRM_COPY = {
  title: '작성한 내용을 삭제할까요?',
  description: '삭제하면 작성한 내용이 사라져요',
  cancelLabel: '그대로 두기',
  confirmLabel: '삭제하기',
} as const;

/**
 * 입력이 있는 항목은 확인 다이얼로그를 거쳐, 입력이 없는 항목은 바로 지우게 하는 훅.
 * `dialogProps`를 `ConfirmAlertDialog`에 펼친다.
 *
 * @param onDiscard 항목을 실제로 지우는 함수
 */
export function useDiscardConfirm(onDiscard: (id: string) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const request = (id: string, hasInput: boolean) => {
    if (hasInput) {
      setPendingId(id);

      return;
    }

    onDiscard(id);
  };

  return {
    request,
    dialogProps: {
      ...DISCARD_INPUT_CONFIRM_COPY,
      open: pendingId !== null,
      onOpenChange: (open: boolean) => {
        if (!open) {
          setPendingId(null);
        }
      },
      onConfirm: () => {
        if (pendingId !== null) {
          onDiscard(pendingId);
        }

        setPendingId(null);
      },
    },
  };
}
