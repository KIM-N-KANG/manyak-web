import './globals.css';

import type { Viewport } from 'next';

import { pretendard } from '@/assets/fonts/fonts';
import { MotionProvider } from '@/components/providers/motion-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body className="bg-muted font-sans text-foreground antialiased">
        <QueryProvider>
          <MotionProvider>
            <ThemeProvider>
              <div className="mx-auto min-h-svh w-full max-w-md bg-background">
                {children}
              </div>
            </ThemeProvider>
          </MotionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
