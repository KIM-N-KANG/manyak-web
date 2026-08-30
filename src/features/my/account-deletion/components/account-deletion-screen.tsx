'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { APP_PATH } from '@/constants/app-path';

import {
  ACCOUNT_DELETION_CONFIRMATIONS,
  ACCOUNT_DELETION_CTA_LABEL,
  ACCOUNT_DELETION_DESCRIPTION,
  ACCOUNT_DELETION_TITLE_LINES,
} from '../constants';

export function AccountDeletionScreen() {
  const router = useRouter();
  const { status } = useSession();
  const [checkedConfirmationIds, setCheckedConfirmationIds] = useState<
    Set<string>
  >(() => new Set());

  const areAllConfirmationsChecked = ACCOUNT_DELETION_CONFIRMATIONS.every(
    ({ id }) => checkedConfirmationIds.has(id),
  );

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [router, status]);

  const handleCheckedChange = (id: string, checked: boolean) => {
    setCheckedConfirmationIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (checked) {
        nextIds.add(id);
      } else {
        nextIds.delete(id);
      }

      return nextIds;
    });
  };

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 scroll-fade-b flex-col overflow-y-auto overscroll-contain">
        <header className="flex flex-col items-start gap-1 p-4">
          <h1 className="text-xl font-semibold">
            {ACCOUNT_DELETION_TITLE_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="text-foreground-secondary">
            {ACCOUNT_DELETION_DESCRIPTION}
          </p>
        </header>

        <fieldset className="flex flex-col gap-6 p-4">
          <legend className="sr-only">탈퇴 전 확인 사항</legend>
          {ACCOUNT_DELETION_CONFIRMATIONS.map(({ id, title, description }) => {
            const checkboxId = `account-deletion-${id}`;
            const descriptionId = `${checkboxId}-description`;

            return (
              <label
                key={id}
                htmlFor={checkboxId}
                className="flex cursor-pointer items-start gap-4">
                <Checkbox
                  id={checkboxId}
                  className="mt-0.5 size-5 border-foreground-tertiary bg-background shadow-none"
                  checked={checkedConfirmationIds.has(id)}
                  aria-describedby={descriptionId}
                  onCheckedChange={(checked) =>
                    handleCheckedChange(id, checked)
                  }
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="leading-snug font-semibold">{title}</span>
                  <span
                    id={descriptionId}
                    className="text-sm leading-relaxed text-foreground-secondary">
                    {description}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <Button
          type="button"
          size="lg"
          variant="destructive"
          className="w-full bg-destructive text-primary-foreground hover:bg-destructive/80"
          disabled={!areAllConfirmationsChecked}>
          {ACCOUNT_DELETION_CTA_LABEL}
        </Button>
      </div>
    </div>
  );
}
