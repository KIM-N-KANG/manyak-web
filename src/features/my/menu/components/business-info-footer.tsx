import Link from 'next/link';

import { APP_PATH } from '@/constants/app-path';
import { SITE_BUSINESS_INFO } from '@/constants/site';

/**
 * 마이 화면 맨 아래의 사업자 정보 푸터. 전자상거래법이 요구하는 사업자 정보 아래에 이용약관과
 * 개인정보 처리방침 링크를 같은 굵기로 둔다. 문서 링크는 마이의 서비스 안내처럼 새 탭에서 연다.
 */
export function BusinessInfoFooter() {
  return (
    <footer className="mt-auto flex flex-col gap-3 px-4 pt-4 pb-2 text-xs text-foreground-secondary">
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
      <nav aria-label="약관 및 정책" className="flex items-center gap-2">
        <Link href={APP_PATH.TERMS} target="_blank" rel="noopener noreferrer">
          서비스 이용약관
        </Link>
        <span aria-hidden="true" className="h-3 w-px bg-border" />
        <Link href={APP_PATH.PRIVACY} target="_blank" rel="noopener noreferrer">
          개인정보 처리방침
        </Link>
      </nav>
    </footer>
  );
}
