import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

export function StoryCompletionSection() {
  return (
    <main className="flex min-h-svh flex-col pb-16">
      <section className="flex flex-1 flex-col px-4 pt-20">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            <span className="block">스토리가 완성되었어요!</span>
            <span className="block">채팅으로 이야기를 이어가보세요</span>
          </h1>
          <p className="text-foreground-secondary">
            내 스토리에 저장되어 언제든 채팅을 이어갈 수 있어요
          </p>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto h-16 max-w-md border-t border-border bg-background px-4">
        <div className="flex h-full w-full items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href={APP_PATH.MAIN.STORIES} />}
            size="lg"
            variant="secondary"
            className="min-w-0 flex-1">
            내 스토리로 이동하기
          </Button>
          <Button type="button" size="lg" className="min-w-0 flex-1">
            채팅 시작하기
          </Button>
        </div>
      </nav>
    </main>
  );
}
