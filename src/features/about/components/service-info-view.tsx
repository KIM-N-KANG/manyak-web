'use client';

import { LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { HomeLogoHeader } from '@/components/layout/home-logo-header';
import { APP_PATH } from '@/constants/app-path';
import { GUEST_LIMITS } from '@/features/onboarding/constants';
import { useTrackOnView } from '@/observability/analytics';

import { SERVICE_INFO_TITLE } from '../constants';

const CONTACT_EMAIL = 'manyak.help@gmail.com';

export function ServiceInfoView() {
  useTrackOnView('client_serviceInfo_viewed');

  return (
    <div className="flex h-full min-h-0 flex-col">
      <HomeLogoHeader />
      <main className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain p-4">
        <article className="flex flex-col gap-8">
          <header>
            <h1 className="text-xl font-bold">{SERVICE_INFO_TITLE}</h1>
          </header>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">크레딧 안내</h2>
            <ul className="flex list-disc flex-col pl-5">
              <li>스토리를 완성할 때 20크레딧이 차감돼요.</li>
              <li>
                채팅을 한 번 보내거나 다시 생성할 때마다 10크레딧이 차감돼요.
              </li>
              <li>스토리라인 생성은 크레딧이 들지 않아요.</li>
              <li>
                출석 체크와 친구 초대로 크레딧을 받을 수 있어요. 친구 초대는
                초대한 사람과 코드를 입력한 사람 모두 500크레딧을 받아요.
              </li>
              <li>
                보상으로 받은 크레딧은 적립일부터 30일 동안 사용할 수 있어요.
              </li>
            </ul>
          </section>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">게스트 이용 안내</h2>
            <ul className="flex list-disc flex-col pl-5">
              <li>
                로그인 없이도 스토리라인 생성 {GUEST_LIMITS.storylineCreate}회,
                스토리 생성 {GUEST_LIMITS.storyCreate}회, 채팅{' '}
                {GUEST_LIMITS.chat}회까지 체험할 수 있어요.
              </li>
              <li>
                게스트로 만든 스토리와 채팅은 지금 쓰는 브라우저에만 연결돼요.
                브라우저 데이터를 지우거나 기기를 바꾸면 다시 불러올 수 없어요.
              </li>
              <li>
                처음 로그인할 때 만들어져 있는 스토리·채팅이 있다면 한 번에 한해
                이 브라우저의 스토리·채팅이 계정으로 옮겨져요. 그 다음
                로그인부터는 옮겨지지 않아요.
              </li>
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
            <h2 className="text-lg font-bold">회원 탈퇴·문의</h2>
            <ul className="flex list-disc flex-col pl-5">
              <li>
                회원 탈퇴를 원하시면{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
                로 요청해 주세요. 확인 후 처리해드려요.
              </li>
              <li>
                서비스 개선 의견은{' '}
                <Link
                  href={APP_PATH.MY_FEEDBACK}
                  className="underline underline-offset-4">
                  피드백
                </Link>
                으로 보내주세요.
              </li>
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
