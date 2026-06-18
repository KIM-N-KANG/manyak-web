import { Button } from '@/components/ui/button';

export function StoryDetailCta() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
      <div className="flex h-full w-full items-center">
        {/** @todo 채팅 시작 플로우 연결 */}
        <Button type="button" size="lg" className="w-full">
          채팅 시작하기
        </Button>
      </div>
    </nav>
  );
}
