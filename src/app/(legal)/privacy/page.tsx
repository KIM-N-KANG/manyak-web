import type { Metadata } from 'next';

import { LegalDocumentView } from '@/features/legal/components/legal-document-view';
import { privacyContent } from '@/features/legal/content/privacy-content';

// 색인 대상 페이지라 문서 제목을 선언한다. 정본인 본문 제목을 재사용한다.
export const metadata: Metadata = {
  title: privacyContent.title,
};

export default function PrivacyPage() {
  return (
    <LegalDocumentView doc={privacyContent} viewEvent="client_privacy_viewed" />
  );
}
