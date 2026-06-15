import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { APP_PATH } from '@/constants/app-path';

export default function ChatsPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <section
        aria-labelledby="chat-empty-title"
        className="flex flex-col items-center gap-8">
        <div className="flex flex-col gap-1 text-center">
          <h3 id="chat-empty-title" className="text-lg font-semibold">
            아직 시작한 채팅이 없어요
          </h3>
          <p>스토리를 만들고 채팅으로 이야기를 이어가 보세요</p>
        </div>

        <Button
          nativeButton={false}
          render={<Link href={APP_PATH.CREATOR.STORY} />}
          size="lg"
          aria-label="스토리 만들기 버튼">
          <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" />
          <span>스토리 만들기</span>
        </Button>
      </section>
    </main>
  );
}
