import Image from 'next/image';

import { cn } from '@/lib/utils';

type CreditMarkProps = {
  /** 옆 글자 크기에 맞춘 `size-*` 클래스. 기본은 본문(16px) 기준이다. */
  className?: string;
};

/**
 * 이프 수치 앞에 붙는 이프 마크. 장식이라 접근성 이름은 주지 않고 글자가 수치를 읽게 둔다.
 * 원본은 래스터라 PNG로 두며, 3x 화면의 24px까지 선명하도록 128px로 내보냈다.
 */
export function CreditMark({ className }: CreditMarkProps) {
  return (
    <Image
      src="/logo/if-credit-mark.png"
      alt=""
      width={128}
      height={128}
      unoptimized
      aria-hidden="true"
      className={cn('inline-block size-4 shrink-0', className)}
    />
  );
}
