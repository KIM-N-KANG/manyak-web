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

  const rows = shown
    ? [
        [
          PUSH_CONSENT_NOTICE_COPY.resultLabel,
          PUSH_CONSENT_NOTICE_COPY.result[shown.result],
        ],
        [PUSH_CONSENT_NOTICE_COPY.senderLabel, PUSH_CONSENT_NOTICE_COPY.sender],
        [
          PUSH_CONSENT_NOTICE_COPY.dateLabel,
          formatDateTime(shown.at.toISOString()),
        ],
      ]
    : [];

  return (
    <AlertDialog open={notice !== null} onOpenChange={onClose}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{PUSH_CONSENT_NOTICE_COPY.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {shown ? PUSH_CONSENT_NOTICE_COPY.result[shown.result] : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <dl className="flex flex-col gap-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-foreground-secondary">{label}</dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <AlertDialogFooter>
          <AlertDialogAction type="button" onClick={onClose}>
            {PUSH_CONSENT_NOTICE_COPY.close}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
