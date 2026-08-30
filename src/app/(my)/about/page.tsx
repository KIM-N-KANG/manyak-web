import type { Metadata } from 'next';

import { ServiceInfoView } from '@/features/about/components/service-info-view';
import { SERVICE_INFO_TITLE } from '@/features/about/constants';

export const metadata: Metadata = {
  title: SERVICE_INFO_TITLE,
};

export default function AboutPage() {
  return <ServiceInfoView />;
}
