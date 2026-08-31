import type { ReactNode } from 'react';

type StorySectionProps = {
  title: string;
  children: ReactNode;
};

export function StorySection({ title, children }: StorySectionProps) {
  return (
    <section className="flex flex-col gap-3 px-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}
