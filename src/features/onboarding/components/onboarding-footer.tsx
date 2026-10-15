'use client';

import Image from 'next/image';
import Link from 'next/link';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { APP_PATH } from '@/constants/app-path';
import {
  SITE_CONTACT_EMAIL,
  SITE_DESCRIPTION,
  SITE_INSTAGRAM_URL,
  SITE_TEAM_NAME,
} from '@/constants/site';
import { SERVICE_INFO_TITLE } from '@/features/about/constants';
import { track } from '@/observability/analytics';

import {
  ONBOARDING_PLAY_STORE_BADGE_ALT,
  ONBOARDING_PLAY_STORE_BADGE_SRC,
  ONBOARDING_PLAY_STORE_URL,
} from '../constants';

const FOOTER_LINKS = [
  { href: APP_PATH.ABOUT, label: SERVICE_INFO_TITLE },
  { href: APP_PATH.TERMS, label: '이용약관' },
  { href: APP_PATH.PRIVACY, label: '개인정보 처리방침' },
] as const;

export function OnboardingFooter() {
  return (
    <footer className="flex flex-col gap-6 border-t border-border bg-muted/50 px-4 py-8 text-sm text-foreground-secondary">
      <div className="flex flex-col gap-2">
        <ManyakLogo className="h-5 w-auto self-start text-foreground-secondary" />
        <p>{SITE_DESCRIPTION}</p>
      </div>
      {/* Google 배지 가이드: 높이 28px 이상, 사방 여백은 배지 높이의 1/4 이상(푸터 gap이 채운다). */}
      <a
        href={ONBOARDING_PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('client_onboarding_playStoreBadge_clicked')}
        className="self-start">
        <Image
          src={ONBOARDING_PLAY_STORE_BADGE_SRC}
          alt={ONBOARDING_PLAY_STORE_BADGE_ALT}
          width={135}
          height={40}
          className="h-10 w-auto"
        />
      </a>
      <nav aria-label="서비스 정보">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex flex-col gap-1 text-xs">
        <p>
          문의{' '}
          <a
            href={`mailto:${SITE_CONTACT_EMAIL}`}
            className="underline-offset-4 hover:underline">
            {SITE_CONTACT_EMAIL}
          </a>
        </p>
        <p>
          <a
            href={SITE_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline">
            Instagram @manyak.story
          </a>
        </p>
        <p>
          © {new Date().getFullYear()} {SITE_TEAM_NAME}. All rights reserved.
        </p>
        <p>Google Play 및 Google Play 로고는 Google LLC의 상표입니다.</p>
      </div>
    </footer>
  );
}
