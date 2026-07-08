'use client';

import { BackHeader } from '@/components/layout/back-header';
import { useTrackOnView } from '@/observability/analytics';

import type { LegalDocument } from '../types';

type LegalDocumentViewProps = {
  doc: LegalDocument;
  viewEvent: 'client_terms_viewed' | 'client_privacy_viewed';
};

export function LegalDocumentView({ doc, viewEvent }: LegalDocumentViewProps) {
  useTrackOnView(viewEvent);

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <BackHeader title={doc.title} />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <article className="mx-auto flex max-w-xl flex-col gap-6 text-sm leading-relaxed text-foreground">
          <header className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold">{doc.title}</h1>
            <p className="text-xs text-foreground-secondary">
              시행일 {doc.effectiveDate} · {doc.version}
            </p>
          </header>
          {doc.intro ? (
            <p className="whitespace-pre-line">{doc.intro}</p>
          ) : null}
          {doc.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="font-semibold">{section.heading}</h2>
              {section.blocks.map((block, index) =>
                block.type === 'paragraph' ? (
                  <p
                    key={`${section.heading}-${index}`}
                    className="whitespace-pre-line text-foreground-secondary">
                    {block.text}
                  </p>
                ) : (
                  <ul
                    key={`${section.heading}-${index}`}
                    className="flex list-disc flex-col gap-1 pl-5 text-foreground-secondary">
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
