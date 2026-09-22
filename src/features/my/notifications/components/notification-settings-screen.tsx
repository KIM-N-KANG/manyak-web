'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useGetPushSettings } from '@/api/generated/endpoints/push/push';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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

const PERMISSION_COPY = {
  prompt: {
    title: PUSH_SETTINGS_COPY.permissionDefault,
    description: PUSH_SETTINGS_COPY.permissionDefaultDescription,
  },
  granted: { title: PUSH_SETTINGS_COPY.permissionGranted, description: null },
  denied: {
    title: PUSH_SETTINGS_COPY.permissionDenied,
    description: PUSH_SETTINGS_COPY.permissionDeniedDescription,
  },
  install: {
    title: PUSH_SETTINGS_COPY.permissionInstall,
    description: PUSH_SETTINGS_COPY.permissionInstallDescription,
  },
  unsupported: {
    title: PUSH_SETTINGS_COPY.permissionUnsupported,
    description: null,
  },
} as const;

type SettingRowProps = {
  id: string;
  label: string;
  description: React.ReactNode;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function SettingRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: SettingRowProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        <p className="text-sm text-foreground-secondary">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
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
  const permission = PERMISSION_COPY[promptState];

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

  return (
    <main className="flex flex-1 flex-col overflow-y-auto overscroll-contain pb-4">
      <section className="flex flex-col py-4">
        <div className="mb-2 px-4">
          <Label>{PUSH_SETTINGS_COPY.permissionSection}</Label>
        </div>
        <div className="flex items-center gap-4 px-4 py-3" role="status">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-base">{permission.title}</p>
            {permission.description && (
              <p className="text-sm break-keep text-foreground-secondary">
                {permission.description}
              </p>
            )}
          </div>
          {promptState === 'prompt' && (
            <Button
              type="button"
              size="sm"
              disabled={isRequestingPermission}
              onClick={() => void enablePermission()}>
              {PUSH_SETTINGS_COPY.permissionEnable}
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col py-4">
        <div className="mb-2 px-4">
          <Label>{PUSH_SETTINGS_COPY.typesSection}</Label>
        </div>
        {settings ? (
          <>
            <SettingRow
              id="push-service"
              label={PUSH_SETTINGS_COPY.service}
              description={PUSH_SETTINGS_COPY.serviceDescription}
              checked={settings.servicePush}
              disabled={isPending}
              onCheckedChange={(servicePush) => change({ servicePush })}
            />
            <SettingRow
              id="push-marketing"
              label={PUSH_SETTINGS_COPY.marketing}
              description={
                <>
                  {PUSH_SETTINGS_COPY.marketingDescription}{' '}
                  <Link
                    href={APP_PATH.PRIVACY}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline">
                    {PUSH_SETTINGS_COPY.privacyLink}
                  </Link>
                </>
              }
              checked={settings.marketingPush}
              disabled={isPending}
              onCheckedChange={(marketingPush) => change({ marketingPush })}
            />
            {settings.marketingPush && (
              <SettingRow
                id="push-marketing-night"
                label={PUSH_SETTINGS_COPY.marketingNight}
                description={PUSH_SETTINGS_COPY.marketingNightDescription}
                checked={settings.marketingNightPush}
                disabled={isPending}
                onCheckedChange={(marketingNightPush) =>
                  change({ marketingNightPush })
                }
              />
            )}
          </>
        ) : loadFailed ? (
          <div className="flex flex-col items-start gap-3 px-4 py-3">
            <p role="alert" className="text-sm text-destructive">
              {PUSH_SETTINGS_COPY.loadFailed}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void settingsQuery.refetch()}>
              {PUSH_SETTINGS_COPY.retry}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 py-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        )}
      </section>

      <PushConsentNoticeDialog
        notice={notice}
        onClose={() => setNotice(null)}
      />
    </main>
  );
}
