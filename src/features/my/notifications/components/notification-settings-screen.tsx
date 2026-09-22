'use client';

import { useEffect, useState } from 'react';

import { LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useGetPushSettings } from '@/api/generated/endpoints/push/push';
import { RetryListStatus } from '@/components/common/retry-list-status';
import { Switch } from '@/components/motion/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_PATH } from '@/constants/app-path';
import { TOAST_MESSAGE } from '@/constants/toast-message';
import { useMemberAccess } from '@/features/auth/_shared/hooks/use-member-access';
import { PushConsentNoticeDialog } from '@/features/my/_shared/components/push-consent-notice-dialog';
import { PUSH_SETTINGS_COPY } from '@/features/my/_shared/constants/push-copy';
import { usePushPromptState } from '@/features/my/_shared/hooks/use-push-prompt-state';
import {
  type PushConsentNotice,
  usePushSettingsUpdate,
} from '@/features/my/_shared/hooks/use-push-settings-update';
import { requestNotificationPermission } from '@/features/my/_shared/utils/push-permission';
import {
  normalizePushSettings,
  type PushSettings,
} from '@/features/my/_shared/utils/push-settings';
import { cn } from '@/lib/utils';

const BANNER_COPY = {
  prompt: PUSH_SETTINGS_COPY.bannerDisabled,
  denied: PUSH_SETTINGS_COPY.bannerDenied,
  install: PUSH_SETTINGS_COPY.bannerInstall,
  unsupported: PUSH_SETTINGS_COPY.bannerUnsupported,
} as const;

type SettingRowProps = {
  label: string;
  description: string;
  checked: boolean | null;
  enabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  detailHref?: string;
  detailLabel?: string;
};

function SettingRow({
  label,
  description,
  checked,
  enabled,
  onCheckedChange,
  detailHref,
  detailLabel,
}: SettingRowProps) {
  return (
    <div className="flex min-h-12 items-center gap-4 px-4 py-3">
      <span
        className={cn(
          'flex flex-1 flex-col text-left text-base',
          !enabled && 'text-foreground-tertiary',
        )}>
        <span className="flex items-center gap-2">
          {label}
          {detailHref && (
            <Link
              href={detailHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={detailLabel}
              className="inline-flex size-6 items-center justify-center rounded-md text-foreground-tertiary">
              <HugeiconsIcon
                icon={LinkSquare01Icon}
                className="size-4"
                aria-hidden="true"
              />
            </Link>
          )}
        </span>
        <span
          className={cn(
            'text-xs text-foreground-secondary',
            !enabled && 'text-foreground-tertiary',
          )}>
          {description}
        </span>
      </span>
      {checked === null ? (
        <Skeleton className="h-7 w-12 rounded-full" />
      ) : (
        <Switch
          checked={checked}
          disabled={!enabled}
          onCheckedChange={onCheckedChange}
          ariaLabel={label}
        />
      )}
    </div>
  );
}

export function NotificationSettingsScreen() {
  const router = useRouter();
  const { status } = useSession();
  const { isMember } = useMemberAccess();
  const promptState = usePushPromptState();
  const settingsQuery = useGetPushSettings({ query: { enabled: isMember } });
  const { update, isPending } = usePushSettingsUpdate();
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [notice, setNotice] = useState<PushConsentNotice | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(APP_PATH.LOGIN);
    }
  }, [router, status]);

  const settings =
    settingsQuery.data?.status === 200
      ? normalizePushSettings(settingsQuery.data.data)
      : null;
  const loadFailed =
    settingsQuery.isError ||
    (settingsQuery.data !== undefined && settingsQuery.data.status !== 200);
  const banner = promptState === 'granted' ? null : BANNER_COPY[promptState];
  const canEnable = promptState === 'prompt' || promptState === 'denied';
  const rowsEnabled =
    (promptState === 'granted' || promptState === 'unsupported') && !isPending;

  const enablePermission = async () => {
    setIsRequestingPermission(true);

    try {
      if ((await requestNotificationPermission()) !== 'granted') {
        toast.error(TOAST_MESSAGE.PUSH_PERMISSION_DENIED);
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const change = (patch: Partial<PushSettings>) => {
    if (!settings) {
      return;
    }

    void update(settings, patch)
      .then((result) => setNotice(result.notice))
      .catch(() => toast.error(TOAST_MESSAGE.PUSH_SETTINGS_SAVE_FAILED));
  };

  if (loadFailed) {
    return (
      <main className="flex flex-1 flex-col">
        <RetryListStatus
          title={PUSH_SETTINGS_COPY.loadFailed}
          onRetry={() => void settingsQuery.refetch()}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-y-auto overscroll-contain pb-2">
      {banner && (
        <div
          role="status"
          className="mx-4 mb-1 flex items-center gap-2 rounded-lg bg-muted py-2 pr-1 pl-4">
          <p className="flex-1 text-sm break-keep">{banner}</p>
          {canEnable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isRequestingPermission}
              onClick={() => void enablePermission()}>
              {PUSH_SETTINGS_COPY.enable}
            </Button>
          )}
        </div>
      )}
      <SettingRow
        label={PUSH_SETTINGS_COPY.service}
        description={PUSH_SETTINGS_COPY.serviceDescription}
        checked={settings?.servicePush ?? null}
        enabled={rowsEnabled}
        onCheckedChange={(servicePush) => change({ servicePush })}
      />
      <SettingRow
        label={PUSH_SETTINGS_COPY.marketing}
        description={PUSH_SETTINGS_COPY.marketingDescription}
        checked={settings?.marketingPush ?? null}
        enabled={rowsEnabled}
        onCheckedChange={(marketingPush) => change({ marketingPush })}
        detailHref={APP_PATH.PRIVACY}
        detailLabel={PUSH_SETTINGS_COPY.privacyPolicy}
      />
      {settings?.marketingPush && (
        <SettingRow
          label={PUSH_SETTINGS_COPY.marketingNight}
          description={PUSH_SETTINGS_COPY.marketingNightDescription}
          checked={settings.marketingNightPush}
          enabled={rowsEnabled}
          onCheckedChange={(marketingNightPush) =>
            change({ marketingNightPush })
          }
        />
      )}
      <PushConsentNoticeDialog
        notice={notice}
        onClose={() => setNotice(null)}
      />
    </main>
  );
}
