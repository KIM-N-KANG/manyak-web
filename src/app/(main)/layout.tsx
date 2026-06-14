import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';
import { MainHeader } from '@/components/layout/main-header';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-svh pb-16">
      <MainHeader />
      {children}
      <BottomNavigationBar />
    </div>
  );
}
