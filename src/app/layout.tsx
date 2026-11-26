import './globals.css';

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { maruburi, pretendard } from '@/assets/fonts/fonts';
import { AppBanner } from '@/components/layout/app-banner';
import { InAppBrowserObserver } from '@/components/layout/in-app-browser-observer';
import { InAppScrollAnchor } from '@/components/layout/in-app-scroll-anchor';
import { IosInputZoomLock } from '@/components/layout/ios-input-zoom-lock';
import { AmplitudeProvider } from '@/components/providers/amplitude-provider';
import { AnalyticsUserSync } from '@/components/providers/analytics-user-sync';
import { AuthSessionProvider } from '@/components/providers/auth-session-provider';
import { InAppNavigationTracker } from '@/components/providers/in-app-navigation-tracker';
import { MetaPixelProvider } from '@/components/providers/meta-pixel-provider';
import { MotionProvider } from '@/components/providers/motion-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { SessionExpiryWatcher } from '@/components/providers/session-expiry-watcher';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { APP_FRAME_ID, APP_SCREEN_ID } from '@/constants/app-frame';
import {
  DEFAULT_TITLE,
  serializeStructuredData,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  TITLE_TEMPLATE,
} from '@/constants/site';
import { AutoMigration } from '@/features/auth/_shared/components/auto-migration';
import { ConsentGate } from '@/features/auth/_shared/components/consent-gate';
import { GuestConsentProvider } from '@/features/auth/_shared/components/guest-consent-provider';
import { MarketingConsentSheet } from '@/features/my/_shared/components/marketing-consent-sheet';
import { PushTokenSync } from '@/features/my/_shared/components/push-token-sync';
import { InviteOnboardingSheet } from '@/features/my/invite/components/invite-onboarding-sheet';

export const metadata: Metadata = {
  // 하위 화면이 제목을 선언하면 `제목 - 마냑`으로 붙고, 없으면 기본 문서 제목이 남는다.
  title: { default: DEFAULT_TITLE, template: TITLE_TEMPLATE },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  verification: {
    // 네이버 서치어드바이저 사이트 소유확인 토큰이다. 공개 노출을 전제로 발급되므로
    // 비밀값이 아니며, 소유확인 유지를 위해 계속 응답에 남아 있어야 한다.
    other: {
      'naver-site-verification': '6a972f6907a63c4074162127be9e0d87ba095789',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

/**
 * 모든 화면을 감싸는 루트 레이아웃. 뷰포트 높이를 소유하는 앱 프레임과 전역 Provider를 둔다.
 *
 * @remarks
 * `ConsentGate`는 세션과 쿼리를 읽으므로 `AuthSessionProvider`, `QueryProvider` 안에 두고,
 * `GuestConsentProvider`는 `ConsentGate`가 내려주는 회원 접근 상태를 쓰므로 그 안에 둔다.
 * 라우트 화면은 앱 프레임 안의 `APP_SCREEN_ID` 요소에 그려지고, 토스트와 화면을 그리지 않는
 * 동기화 컴포넌트, 전역 시트는 프레임 밖 형제로 둔다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${maruburi.variable} antialiased`}
      suppressHydrationWarning>
      <head>
        {/* react-grab은 전체 화면 오버레이를 깔아 포인터 이벤트를 가로채므로 E2E(dev 서버 사용)의 클릭을 모두 막는다.
            그래서 개발 모드에서도 자동 로드하지 않고 `pnpm dev:grab`으로 명시적으로 켤 때만 주입한다. */}
        {process.env.NODE_ENV === 'development' &&
          process.env.REACT_GRAB === '1' && (
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          )}
        {/* 브랜드 엔티티(WebSite·Organization) 구조화 데이터. '마냑'이 오타가 아닌
            서비스명임을 검색엔진에 알린다. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredData() }}
        />
      </head>
      {/* suppressHydrationWarning: 카카오톡 iOS 웹뷰가 body에 -webkit-text-size-adjust 스타일을 주입해 속성 불일치 경고가 발생 */}
      <body className="font-sans text-foreground" suppressHydrationWarning>
        <IosInputZoomLock />
        <InAppScrollAnchor />
        <AmplitudeProvider>
          <MetaPixelProvider>
            <AuthSessionProvider>
              <QueryProvider>
                <ThemeProvider>
                  <MotionProvider>
                    <ConsentGate>
                      <GuestConsentProvider>
                        <div
                          id={APP_FRAME_ID}
                          className="relative mx-auto flex h-dvh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
                          <AppBanner />
                          <div
                            id={APP_SCREEN_ID}
                            className="relative flex min-h-0 flex-1 flex-col outline-none">
                            {children}
                          </div>
                          <InAppBrowserObserver />
                        </div>
                        <Toaster />
                        <AnalyticsUserSync />
                        <SessionExpiryWatcher />
                        <InAppNavigationTracker />
                        <AutoMigration />
                        <InviteOnboardingSheet />
                        <PushTokenSync />
                        <MarketingConsentSheet />
                      </GuestConsentProvider>
                    </ConsentGate>
                  </MotionProvider>
                </ThemeProvider>
              </QueryProvider>
            </AuthSessionProvider>
          </MetaPixelProvider>
        </AmplitudeProvider>
      </body>
    </html>
  );
}
