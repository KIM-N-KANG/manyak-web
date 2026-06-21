import './globals.css';

import type { Viewport } from 'next';

import { maruburi, pretendard } from '@/assets/fonts/fonts';
import { MotionProvider } from '@/components/providers/motion-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <QueryProvider>
          <MotionProvider>
            <ThemeProvider>
              <div className="mx-auto flex h-svh min-h-0 w-full max-w-md flex-col overflow-hidden bg-background">
                {children}
              </div>
              <Toaster />
            </ThemeProvider>
          </MotionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
