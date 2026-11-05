import { Suspense } from 'react';

import type { Metadata } from 'next';

import { EXPLORE_SEARCH_COPY } from '@/features/stories/_shared/constants/explore-search';
import { ExploreSearchScreen } from '@/features/stories/explore/components/explore-search-screen';

export const metadata: Metadata = {
  title: EXPLORE_SEARCH_COPY.label,
  robots: { index: false, follow: true },
};

export default function ExploreSearchPage() {
  return (
    <Suspense>
      <ExploreSearchScreen />
    </Suspense>
  );
}
