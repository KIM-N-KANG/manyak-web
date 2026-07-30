import type { Metadata } from 'next';

import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { termsContent } from '@/features/legal/content/terms-content';

// 색인 대상 페이지라 문서 제목을 선언한다. 정본인 본문 제목을 재사용한다.
export const metadata: Metadata = {
  title: termsContent.title,
};

export default function TermsPage() {
  return (
    <LegalDocumentView doc={termsContent} viewEvent="client_terms_viewed" />
  );
}
