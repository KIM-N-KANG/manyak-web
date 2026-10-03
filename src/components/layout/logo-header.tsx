import { ManyakLogo } from './manyak-logo';

/**
 * 문서 화면(서비스 안내, 법적 문서) 상단의 로고 헤더.
 * Android 앱이 같은 페이지를 WebView로 열기 때문에 로고를 링크로 두지 않는다.
 * 링크가 있으면 WebView 안에서 웹 홈으로 넘어간다.
 */
export function LogoHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center bg-background px-4">
      <ManyakLogo className="h-6 w-auto text-primary" />
    </header>
  );
}
