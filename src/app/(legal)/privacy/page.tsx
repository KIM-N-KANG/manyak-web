import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { privacyContent } from '@/features/legal/content/privacy-content';

export default function PrivacyPage() {
  return (
    <LegalDocumentView doc={privacyContent} viewEvent="client_privacy_viewed" />
  );
}
