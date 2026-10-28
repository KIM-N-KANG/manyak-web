'use client';

import { m, useReducedMotion } from 'motion/react';

import { CreditMark } from '@/components/common/credit-mark';
import { formatCreditAmount } from '@/constants/credit';
import { LOGIN_COPY } from '@/features/auth/_shared/constants/login';
import { useCreditPolicy } from '@/hooks/use-credit-policy';
import { EASE_IN_OUT } from '@/lib/ease';
import { cn } from '@/lib/utils';

export function SignupBenefitBadge() {
  const signupReward = useCreditPolicy()?.signupReward;
  const reduce = useReducedMotion() ?? false;

  return (
    <m.p
      animate={reduce ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 2.4, ease: EASE_IN_OUT, repeat: Infinity }}
      className="flex items-center gap-1 rounded-full bg-muted px-3.5 py-2 text-sm font-medium">
      {LOGIN_COPY.signupBenefit.prefix}{' '}
      <span
        className={cn(
          'flex items-center gap-1 font-semibold text-primary',
          signupReward === undefined && 'animate-pulse',
        )}>
        <CreditMark className="size-3.5" />
        {formatCreditAmount(signupReward)} {LOGIN_COPY.signupBenefit.unit}
      </span>{' '}
      {LOGIN_COPY.signupBenefit.suffix}
    </m.p>
  );
}
