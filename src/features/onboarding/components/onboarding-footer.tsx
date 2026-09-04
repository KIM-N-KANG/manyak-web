'use client';

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

const FOOTER_LINKS = [
  { href: APP_PATH.ABOUT, label: SERVICE_INFO_TITLE },
  { href: APP_PATH.TERMS, label: '이용약관' },
  { href: APP_PATH.PRIVACY, label: '개인정보 처리방침' },
] as const;

/**
 * 온보딩 랜딩 최하단 푸터. 서비스 소개·정책 링크·문의처·저작권을 담는다.
 * 랜딩 스크롤 콘텐츠의 끝이라 화면 셸의 고정 푸터가 아니라 본문 안에 놓인다.
 */
export function OnboardingFooter() {
  return (
    <footer className="flex flex-col gap-6 border-t border-border bg-muted/50 px-4 py-8 text-sm text-foreground-secondary">
      <div className="flex flex-col gap-2">
        <ManyakLogo className="h-5 w-auto self-start text-foreground-secondary" />
        <p>{SITE_DESCRIPTION}</p>
      </div>
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
      </div>
    </footer>
  );
}
