import type { Metadata } from 'next';

import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { termsContent } from '@/features/legal/content/terms-content';

export const metadata: Metadata = {
  title: '서비스이용약관',
};

export default function TermsPage() {
  return (
    <LegalDocumentView doc={termsContent} viewEvent="client_terms_viewed" />
  );
}
