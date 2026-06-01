import './globals.css';

import { pretendard } from '@/assets/fonts/fonts';
import { MotionProvider } from '@/components/providers/motion-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body className="bg-background font-sans text-foreground antialiased">
        <QueryProvider>
          <MotionProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </MotionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
