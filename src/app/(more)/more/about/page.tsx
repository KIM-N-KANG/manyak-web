import type { Metadata } from 'next';

import { ServiceInfoView } from '@/features/my/about/components/service-info-view';

export const metadata: Metadata = {
  title: '서비스 안내',
};

export default function MoreAboutPage() {
  return <ServiceInfoView />;
}
