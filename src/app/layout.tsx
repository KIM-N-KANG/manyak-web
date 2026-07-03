import './globals.css';

import type { Metadata, Viewport } from 'next';

import { maruburi, pretendard } from '@/assets/fonts/fonts';
import { AmplitudeProvider } from '@/components/providers/amplitude-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { APP_FRAME_ID } from '@/constants/app-frame';

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
      <body className="bg-border font-sans text-foreground">
        <AmplitudeProvider>
          <QueryProvider>
            <ThemeProvider>
              <div
                id={APP_FRAME_ID}
                className="relative mx-auto flex h-svh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
                {children}
              </div>
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AmplitudeProvider>
      </body>
    </html>
  );
}
