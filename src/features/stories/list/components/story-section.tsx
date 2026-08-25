import type { ReactNode } from 'react';

type StorySectionProps = {
  title: string;
  children: ReactNode;
};

/**
 * 제목이 붙은 홈 목록 섹션.
 * 제목은 내용 상태(목록·빈 상태·로딩·에러)와 무관하게 유지해 화면 구조가 상태마다 바뀌지 않게 한다.
 */
export function StorySection({ title, children }: StorySectionProps) {
  return (
    <section className="flex flex-col gap-3 px-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
