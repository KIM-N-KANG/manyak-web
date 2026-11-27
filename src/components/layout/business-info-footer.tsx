'use client';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import {
  SITE_BUSINESS_INFO,
  SITE_FTC_BUSINESS_INFO_URL,
} from '@/constants/site';

type BusinessInfoFooterProps = {
  /** 사업자 정보를 접어 두고 "사업자 정보" 버튼으로 펼칠지 여부다. 홈은 접고 마이는 펼친다. */
  collapsible?: boolean;
};

/** 문서 링크의 탭 영역을 위아래 여백으로 넓히고, 같은 크기의 음수 여백으로 배치는 그대로 둔다. */
const LEGAL_LINK_CLASS_NAME = '-my-3 py-3';

/** 사업자 정보의 라벨과 값 쌍 목록. 줄 바꿈은 쌍 단위로 한다. */
function BusinessInfoList() {
  return (
    <address className="not-italic">
      <dl className="flex flex-wrap gap-x-3 gap-y-1 break-keep">
        {SITE_BUSINESS_INFO.map(({ label, value }) => (
          <div key={label} className="flex gap-1">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </address>
  );
}

/** 문서 링크 사이의 세로 구분선. */
function LinkSeparator() {
  return <span aria-hidden="true" className="h-3 w-px bg-border" />;
}

/**
 * 홈과 마이 화면 맨 아래의 사업자 정보 푸터. 위 내용과 넉넉히 띄운 연한 구분선으로 본문과 나눈다.
 * 전자상거래법이 요구하는 사업자 정보 아래에 이용약관, 개인정보 처리방침과 공정거래위원회 사업자정보 확인
 * 링크를 같은 굵기로 두고, 링크는 모두 새 탭에서 연다.
 * 접는 경우 사업자 정보만 `details`로 접고 링크는 접어도 보이게 한다.
 */
export function BusinessInfoFooter({
  collapsible = false,
}: BusinessInfoFooterProps) {
  return (
    <footer className="mt-auto px-4 pt-10 pb-4 text-xs text-foreground-secondary">
      <div className="flex flex-col gap-3 border-t border-border pt-5">
        {collapsible ? (
          <details className="group">
            {/* 화살표는 라벨 바로 오른쪽에 두고, 접힘은 아래, 펼침은 위를 가리키게 돌린다. */}
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-1 [&::-webkit-details-marker]:hidden">
              사업자 정보
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <div className="pt-2">
              <BusinessInfoList />
            </div>
          </details>
        ) : (
          <BusinessInfoList />
        )}
        <nav aria-label="약관 및 정책" className="flex items-center gap-2">
          <Link
            href={APP_PATH.TERMS}
            target="_blank"
            rel="noopener noreferrer"
            className={LEGAL_LINK_CLASS_NAME}>
            서비스 이용약관
          </Link>
          <LinkSeparator />
          <Link
            href={APP_PATH.PRIVACY}
            target="_blank"
            rel="noopener noreferrer"
            className={LEGAL_LINK_CLASS_NAME}>
            개인정보 처리방침
          </Link>
          <LinkSeparator />
          <a
            href={SITE_FTC_BUSINESS_INFO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={LEGAL_LINK_CLASS_NAME}>
            사업자정보 확인
          </a>
        </nav>
      </div>
    </footer>
  );
}
