'use client';

import { LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { LogoHeader } from '@/components/layout/logo-header';
import { APP_PATH } from '@/constants/app-path';
import { useTrackOnView } from '@/observability/analytics';

import {
  SERVICE_FEEDBACK_GUIDE,
  SERVICE_GUEST_INFO,
  SERVICE_GUEST_INFO_SCOPE,
  SERVICE_INFO_TITLE,
} from '../constants';

export function ServiceInfoView() {
  useTrackOnView('client_serviceInfo_viewed');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <LogoHeader />
      <main className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain p-4">
        <article className="flex flex-col gap-8">
          <header>
            <h1 className="text-xl font-bold">{SERVICE_INFO_TITLE}</h1>
          </header>
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">게스트 이용 안내</h2>
              <p className="text-sm text-foreground-secondary">
                {SERVICE_GUEST_INFO_SCOPE}
              </p>
            </div>
            <ul className="flex list-disc flex-col pl-5">
              {SERVICE_GUEST_INFO.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">AI 콘텐츠 안내</h2>
            <ul className="flex list-disc flex-col pl-5">
              <li>스토리와 채팅 응답은 AI가 만든 허구의 창작물이에요.</li>
              <li>
                실제 인물·사건과 관련이 없으며, 부정확하거나 부적절한 내용이
                포함될 수 있어요.
              </li>
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">문의</h2>
            <ul className="flex list-disc flex-col pl-5">
              <li>{SERVICE_FEEDBACK_GUIDE}</li>
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">약관 및 정책</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href={APP_PATH.TERMS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-4">
                  서비스 이용약관
                  <HugeiconsIcon
                    icon={LinkSquare01Icon}
                    className="size-4"
                    aria-hidden="true"
                  />
                </Link>
              </li>
              <li>
                <Link
                  href={APP_PATH.PRIVACY}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-4">
                  개인정보 처리방침
                  <HugeiconsIcon
                    icon={LinkSquare01Icon}
                    className="size-4"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
