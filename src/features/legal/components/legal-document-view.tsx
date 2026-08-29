'use client';

import Link from 'next/link';

import { ManyakLogo } from '@/components/layout/manyak-logo';
import { APP_PATH } from '@/constants/app-path';
import { useTrackOnView } from '@/observability/analytics';

import type { LegalDocument } from '../types';

type LegalDocumentViewProps = {
  doc: LegalDocument;
  viewEvent: 'client_terms_viewed' | 'client_privacy_viewed';
};

export function LegalDocumentView({ doc, viewEvent }: LegalDocumentViewProps) {
  useTrackOnView(viewEvent);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center bg-background px-4">
        <Link href={APP_PATH.MAIN.STORIES} aria-label="홈으로 이동">
          <ManyakLogo className="h-6 w-auto text-primary" />
        </Link>
      </header>
      <main className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain p-4">
        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">{doc.title}</h1>
            <p className="text-sm text-foreground-secondary">
              시행일 {doc.effectiveDate} · {doc.version}
            </p>
          </header>
          {doc.intro ? (
            <p className="whitespace-pre-line">{doc.intro}</p>
          ) : null}
          {doc.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="text-lg font-bold">{section.heading}</h2>
              {section.blocks.map((block, index) =>
                block.type === 'paragraph' ? (
                  <p
                    key={`${section.heading}-${index}`}
                    className="whitespace-pre-line">
                    {block.text}
                  </p>
                ) : (
                  <ul
                    key={`${section.heading}-${index}`}
                    className="flex list-disc flex-col pl-5">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
