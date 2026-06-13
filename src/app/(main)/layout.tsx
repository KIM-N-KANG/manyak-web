import { BottomNavigationBar } from '@/components/layout/bottom-navigation-bar';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-svh pb-16">
      {children}
      <BottomNavigationBar />
    </div>
  );
}
