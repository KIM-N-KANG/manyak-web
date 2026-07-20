'use client';

import { useRef } from 'react';

import { BackHeader } from '@/components/layout/back-header';
import { APP_PATH } from '@/constants/app-path';
import { useInView } from '@/hooks/use-in-view';
import { useTrackOnView } from '@/observability/analytics';

import type { LegalDocument } from '../types';

type LegalDocumentViewProps = {
  doc: LegalDocument;
  viewEvent: 'client_terms_viewed' | 'client_privacy_viewed';
};

export function LegalDocumentView({ doc, viewEvent }: LegalDocumentViewProps) {
  useTrackOnView(viewEvent);

  const contentRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const isTitleInView = useInView({ targetRef: titleRef, rootRef: contentRef });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader
        title={doc.title}
        fallbackHref={APP_PATH.MAIN.STORIES}
        showTitle={!isTitleInView}
      />
      <main
        ref={contentRef}
        className="min-h-0 flex-1 scroll-fade-b overflow-y-auto overscroll-contain p-4 pb-8">
        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-1">
            <h1 ref={titleRef} className="text-xl font-bold">
              {doc.title}
            </h1>
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
