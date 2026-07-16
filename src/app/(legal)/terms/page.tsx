import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { termsContent } from '@/features/legal/content/terms-content';

export default function TermsPage() {
  return (
    <LegalDocumentView doc={termsContent} viewEvent="client_terms_viewed" />
  );
}
