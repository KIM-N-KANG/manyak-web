'use client';

import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDateTime } from '@/lib/format-date';

import { PUSH_CONSENT_NOTICE_COPY } from '../constants/push-copy';
import type { PushConsentNotice } from '../hooks/use-push-settings-update';

type PushConsentNoticeDialogProps = {
  notice: PushConsentNotice | null;
  onClose: () => void;
};

/**
 * 광고, 야간 알림 동의 처리 결과(전송자, 일시, 결과)를 알리는 다이얼로그.
 * `notice`가 null로 바뀌어 닫히는 애니메이션 동안 내용이 비지 않도록 마지막 통지를 state로 붙잡아 그린다.
 */
export function PushConsentNoticeDialog({
  notice,
  onClose,
}: PushConsentNoticeDialogProps) {
  const [shown, setShown] = useState(notice);

  if (notice !== null && notice !== shown) {
    setShown(notice);
  }

  const lines = shown
    ? [
        `${PUSH_CONSENT_NOTICE_COPY.senderLabel}: ${PUSH_CONSENT_NOTICE_COPY.sender}`,
        `${PUSH_CONSENT_NOTICE_COPY.dateLabel}: ${formatDateTime(shown.at.toISOString())}`,
        `${PUSH_CONSENT_NOTICE_COPY.resultLabel}: ${PUSH_CONSENT_NOTICE_COPY.result[shown.result]}`,
      ]
    : [];

  return (
    <AlertDialog open={notice !== null} onOpenChange={onClose}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{PUSH_CONSENT_NOTICE_COPY.title}</AlertDialogTitle>
          <AlertDialogDescription className="flex flex-col gap-1 text-left">
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="grid-cols-1">
          <AlertDialogAction type="button" onClick={onClose}>
            {PUSH_CONSENT_NOTICE_COPY.close}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
