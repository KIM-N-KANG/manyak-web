'use client';

import { useEffect, useRef, useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import {
  useGetConsents1,
  useRecordConsents1,
} from '@/api/generated/endpoints/guest/guest';
import { LoadingButtonContent } from '@/components/common/loading-button-content';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { API_ERROR_CODE } from '@/constants/api-error-code';
import { APP_PATH } from '@/constants/app-path';
import { CONSENT_SHEET_COPY } from '@/features/auth/_shared/constants/consent';
import { GUEST_CONSENT_COPY as COPY } from '@/features/auth/_shared/constants/guest-consent';
import { parseGuestConsent } from '@/features/auth/_shared/utils/guest-consent-status';
import { guestConsentSections } from '@/features/legal/content/guest-consent-content';
import { useAppFrameContainer } from '@/hooks/use-app-frame-container';
import { getApiErrorCode } from '@/lib/custom-fetch';
import { cn } from '@/lib/utils';

export function GuestConsentSheet({
  onFinish,
}: {
  onFinish: (accepted: boolean) => void;
}) {
  const container = useAppFrameContainer();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const active = useRef(true);
  const submitting = useRef(false);
  const consent = useGetConsents1({
    query: {
      staleTime: 0,
      gcTime: 0,
      retry: false,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });
  const record = useRecordConsents1({ mutation: { retry: false } });
  const status =
    consent.isSuccess && consent.data.status === 200
      ? parseGuestConsent(consent.data.data)
      : null;
  const loadError = !consent.isFetching && !status;

  useEffect(() => {
    active.current = true;

    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (!consent.isFetching && status?.needsConsent === false && !notice) {
      active.current = false;
      onFinish(true);
    }
  }, [consent.isFetching, status?.needsConsent, notice, onFinish]);

  const submit = async () => {
    if (!active.current || !status || consent.isFetching || submitting.current)
      return;

    submitting.current = true;
    setNotice(null);

    try {
      const response = await record.mutateAsync({
        data: { guestPrivacy: status.requiredVersion },
      });

      if (!active.current) return;

      const saved =
        response.status === 200 ? parseGuestConsent(response.data) : null;

      if (
        saved?.needsConsent !== false ||
        saved.requiredVersion !== status.requiredVersion
      ) {
        throw new Error('Guest consent was not confirmed');
      }

      active.current = false;
      onFinish(true);
    } catch (error) {
      if (!active.current) return;

      if (getApiErrorCode(error) === API_ERROR_CODE.CONSENT_VERSION_MISMATCH) {
        setNotice(CONSENT_SHEET_COPY.error.versionMismatch);
        setDetail(true);
        await consent.refetch();
      } else {
        setNotice(CONSENT_SHEET_COPY.error.retryable);
      }
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Drawer
      open={
        container !== null &&
        consent.isFetched &&
        (status?.needsConsent !== false || notice !== null)
      }
      onOpenChange={(open) => {
        if (!open) {
          active.current = false;
          onFinish(false);
        }
      }}>
      <DrawerContent
        container={container}
        ref={sheetRef}
        initialFocus={sheetRef}>
        <DrawerHeader className="px-4 pt-4 pb-0 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
          <div className="flex items-center gap-2">
            {detail && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={COPY.back}
                onClick={() => setDetail(false)}>
                <ChevronLeft />
              </Button>
            )}
            <DrawerTitle className="text-lg font-bold whitespace-nowrap">
              {detail ? COPY.detailTitle : COPY.title}
            </DrawerTitle>
          </div>
          <DrawerDescription className="sr-only">
            {COPY.consentDescription}
          </DrawerDescription>
        </DrawerHeader>
        <div
          key={String(detail)}
          className={cn(
            'min-h-0 scroll-fade-b overflow-y-auto overscroll-contain px-4',
            detail ? 'py-5' : 'py-8',
          )}>
          {detail ? (
            <div className="flex flex-col gap-6 text-sm leading-relaxed">
              {guestConsentSections.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h2 className="font-semibold">{section.heading}</h2>
                  {section.blocks.map((block, index) =>
                    block.type === 'paragraph' ? (
                      <p key={index} className="text-foreground-secondary">
                        {block.text}
                      </p>
                    ) : (
                      <ul
                        key={index}
                        className="list-disc space-y-2 pl-4 text-foreground-secondary">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ),
                  )}
                </section>
              ))}
              <div className="flex flex-col gap-3 underline">
                <Link
                  href={APP_PATH.TERMS}
                  target="_blank"
                  rel="noopener noreferrer">
                  {COPY.terms}
                </Link>
                <Link
                  href={APP_PATH.PRIVACY}
                  target="_blank"
                  rel="noopener noreferrer">
                  {COPY.privacy}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {[
                [COPY.aiTitle, COPY.aiDescription],
                [COPY.safetyTitle, COPY.safetyDescription],
                [COPY.consentTitle, COPY.consentDescription],
              ].map(([title, description], index) => (
                <section key={title} className="rounded-xl bg-muted p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 text-base leading-6 font-bold">
                      {title}
                    </h2>
                    {index === 2 && (
                      <button
                        type="button"
                        onClick={() => setDetail(true)}
                        className="flex h-6 shrink-0 items-center gap-0.5 text-xs text-foreground-secondary">
                        {COPY.detail}
                        <ChevronRight className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                    {description}
                  </p>
                </section>
              ))}
            </div>
          )}
        </div>
        <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {(loadError || notice) && (
            <p role="alert" className="text-sm text-destructive">
              {loadError ? CONSENT_SHEET_COPY.loadError.title : notice}
            </p>
          )}
          <Button
            size="lg"
            className="relative"
            disabled={consent.isFetching || record.isPending}
            onClick={loadError ? () => void consent.refetch() : submit}>
            <LoadingButtonContent
              isLoading={consent.isFetching || record.isPending}
              loadingLabel={CONSENT_SHEET_COPY.submitPending}>
              {loadError ? CONSENT_SHEET_COPY.retry : COPY.agree}
            </LoadingButtonContent>
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
