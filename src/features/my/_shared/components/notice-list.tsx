import { useId } from 'react';

import { cn } from '@/lib/utils';

type NoticeListProps = {
  title: string;
  items: readonly string[];
  /** 바깥 여백처럼 자리마다 다른 클래스. */
  className?: string;
};

/**
 * 이프 충전 구매 탭과 친구 초대 화면 아래의 안내 목록. 상자나 묶음 없이 작은 제목 하나와
 * 보조 글자색 글머리표 목록 하나로 보여 준다.
 */
export function NoticeList({ title, items, className }: NoticeListProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn('flex flex-col gap-2', className)}>
      <h2 id={titleId} className="text-sm font-semibold">
        {title}
      </h2>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs leading-5 text-foreground-secondary">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
