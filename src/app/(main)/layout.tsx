import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col pb-16">
      <MainHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <BottomNavigationBar />
    </div>
  );
}
