import type { Metadata } from 'next';

import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { privacyContent } from '@/features/legal/content/privacy-content';

export const metadata: Metadata = {
  title: '개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <LegalDocumentView doc={privacyContent} viewEvent="client_privacy_viewed" />
  );
}
