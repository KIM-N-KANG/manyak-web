import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import {
  SITE_BUSINESS_INFO,
  SITE_FTC_BUSINESS_INFO_URL,
} from '@/constants/site';

/** 문서 링크의 탭 영역을 위아래 여백으로 넓히고, 같은 크기의 음수 여백으로 배치는 그대로 둔다. */
const LEGAL_LINK_CLASS_NAME = '-my-3 py-3';

/** 문서 링크 사이의 세로 구분선. */
function LinkSeparator() {
  return <span aria-hidden="true" className="h-3 w-px bg-border" />;
}

/**
 * 홈과 마이 화면 맨 아래의 사업자 정보 푸터. 위 내용과의 간격(48px)은 푸터가 갖고, 연한 구분선으로 본문과 나눈다.
 * 전자상거래법이 요구하는 사업자 정보 아래에 이용약관, 개인정보 처리방침과 공정거래위원회 사업자정보 확인
 * 링크를 같은 굵기로 두고, 링크는 모두 새 탭에서 연다.
 */
export function BusinessInfoFooter() {
  return (
    <footer className="px-4 pt-12 pb-4 text-xs text-foreground-secondary">
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <dl className="flex flex-wrap gap-x-3 gap-y-1 break-keep">
          {SITE_BUSINESS_INFO.map(({ label, value }) => (
            <div key={label} className="flex gap-1">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
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
