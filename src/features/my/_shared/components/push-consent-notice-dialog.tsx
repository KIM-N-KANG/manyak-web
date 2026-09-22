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
