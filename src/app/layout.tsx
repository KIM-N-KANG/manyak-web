import './globals.css';

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { maruburi, pretendard } from '@/assets/fonts/fonts';
import { InAppBrowserEscape } from '@/components/layout/in-app-browser-escape';
import { IosInputZoomLock } from '@/components/layout/ios-input-zoom-lock';
import { AmplitudeProvider } from '@/components/providers/amplitude-provider';
import { AnalyticsUserSync } from '@/components/providers/analytics-user-sync';
import { AuthSessionProvider } from '@/components/providers/auth-session-provider';
import { MetaPixelProvider } from '@/components/providers/meta-pixel-provider';
import { MotionProvider } from '@/components/providers/motion-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { SessionExpiryWatcher } from '@/components/providers/session-expiry-watcher';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { APP_FRAME_ID } from '@/constants/app-frame';
import { AutoMigration } from '@/features/auth/_shared/components/auto-migration';
import { HandoffCleanup } from '@/features/auth/_shared/components/handoff-cleanup';
import { InviteOnboardingDialog } from '@/features/more/invite/components/invite-onboarding-dialog';

export const metadata: Metadata = {
  title: '마냑',
  description: '나만의 스토리를 만들고 채팅으로 이어나가는 AI 인터랙티브 채팅',
  applicationName: '마냑',
  metadataBase: new URL('https://manyak.app'),
  openGraph: {
    type: 'website',
    siteName: '마냑',
    title: '마냑',
    description:
      '나만의 스토리를 만들고 채팅으로 이어나가는 AI 인터랙티브 채팅',
    url: 'https://manyak.app',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: '마냑',
    description:
      '나만의 스토리를 만들고 채팅으로 이어나가는 AI 인터랙티브 채팅',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

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
      </head>
      {/* suppressHydrationWarning: 카카오톡 iOS 웹뷰가 body에 -webkit-text-size-adjust 스타일을 주입해 속성 불일치 경고가 발생 */}
      <body
        className="bg-border font-sans text-foreground"
        suppressHydrationWarning>
        <IosInputZoomLock />
        <AmplitudeProvider>
          <MetaPixelProvider>
            <AuthSessionProvider>
              <QueryProvider>
                <ThemeProvider>
                  <MotionProvider>
                    <div
                      id={APP_FRAME_ID}
                      className="relative mx-auto flex h-svh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
                      {children}
                      <InAppBrowserEscape />
                    </div>
                    <Toaster />
                    <AnalyticsUserSync />
                    <SessionExpiryWatcher />
                    <AutoMigration />
                    <HandoffCleanup />
                    <InviteOnboardingDialog />
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
