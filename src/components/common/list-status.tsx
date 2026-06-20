import type { ReactNode } from 'react';

type ListStatusProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ListStatus({ title, description, children }: ListStatusProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <section className="flex flex-col items-center gap-8">
        <div className="flex flex-col gap-1 text-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p>{description}</p>
        </div>
        {children}
      </section>
    </div>
  );
}
