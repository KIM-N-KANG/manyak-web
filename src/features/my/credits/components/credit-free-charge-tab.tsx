'use client';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { InviteMenuItem } from '@/features/my/_shared/components/invite-menu-item';
import { useClaimAttendance } from '@/features/my/_shared/hooks/use-claim-attendance';
import { track } from '@/observability/analytics';

import { CREDIT_CHARGE_COPY } from '../constants';

type CreditFreeChargeTabProps = {
  /** 오늘 이미 출석했는지 여부. 프로필(`GET /auth/me`)의 `attendedToday`다. */
  attendedToday: boolean;
  /** 프로필 조회가 끝나 출석 가능 여부를 판정할 수 있는지. */
  isMeReady: boolean;
};

/** 이프를 무료로 얻는 수단만 모은 탭. 출석 체크와 친구 초대 진입으로 구성한다. */
export function CreditFreeChargeTab({
  attendedToday,
  isMeReady,
}: CreditFreeChargeTabProps) {
  const { claimAttendance, isClaiming } = useClaimAttendance();

  return (
    // 초대 줄은 마이 메뉴와 같은 전체 너비 행이라 가로 여백은 상자 쪽에만 준다.
    <div className="flex h-full scroll-fade-b flex-col gap-8 overflow-y-auto overscroll-contain pt-4 pb-2">
      <section className="mx-4 flex flex-col gap-4 rounded-lg bg-muted p-4">
        <h2 className="text-lg font-bold">
          {CREDIT_CHARGE_COPY.attendanceTitleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            className="relative w-full"
            disabled={!isMeReady || attendedToday || isClaiming}
            onClick={() => {
              track('client_account_attendanceButton_clicked');
              claimAttendance();
            }}>
            <span className={isClaiming ? 'invisible' : undefined}>
              {attendedToday
                ? CREDIT_CHARGE_COPY.attendanceDoneButton
                : CREDIT_CHARGE_COPY.attendanceButton}
            </span>
            {isClaiming && (
              <Spinner
                className="absolute"
                aria-label={CREDIT_CHARGE_COPY.attendanceClaiming}
              />
            )}
          </Button>
          <ul className="flex flex-col text-right">
            {CREDIT_CHARGE_COPY.attendanceNotes.map((note) => (
              <li key={note} className="text-xs text-foreground-secondary">
                {note}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <InviteMenuItem />
    </div>
  );
}
