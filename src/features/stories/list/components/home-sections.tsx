'use client';

import { useHome } from '@/api/generated/endpoints/story-home-controller/story-home-controller';
import type { StoryHomeResponse } from '@/api/generated/models';
import { EmptyListNotice } from '@/components/common/empty-list-notice';
import { RetryListStatus } from '@/components/common/retry-list-status';
import {
  STORY_LIST_COPY,
  STORY_LIST_ERROR_TITLE,
} from '@/features/stories/_shared/constants/story-list';
import { useDelayedLoading } from '@/hooks/use-delayed-loading';
import { useTrackOnView } from '@/observability/analytics';

import { toVisibleHomeSections } from '../utils/home-sections';
import { HomeSectionRow } from './home-section-row';
import { HomeSectionsSkeleton } from './home-sections-skeleton';

type HomeSectionsProps = {
  /** 서버 렌더 시점에 읽은 홈 목록. 없으면 클라이언트가 조회한다. */
  initialData?: StoryHomeResponse;
};

export function HomeSections({ initialData }: HomeSectionsProps) {
  useTrackOnView('client_storyList_viewed');

  const { data, isPending, isError, refetch } = useHome({
    query: {
      initialData: initialData
        ? { data: initialData, status: 200, headers: new Headers() }
        : undefined,
    },
  });
  const showSkeleton = useDelayedLoading(isPending);
  const sections = toVisibleHomeSections(
    data?.status === 200 ? data.data : undefined,
  );

  const renderContent = () => {
    if (isPending) {
      return showSkeleton ? <HomeSectionsSkeleton /> : null;
    }

    if (isError && sections.length === 0) {
      return (
        <RetryListStatus
          title={STORY_LIST_ERROR_TITLE}
          onRetry={() => void refetch()}
        />
      );
    }

    if (sections.length === 0) {
      return <EmptyListNotice>{STORY_LIST_COPY.empty}</EmptyListNotice>;
    }

    return sections.map((section, index) => (
      <HomeSectionRow
        key={section.key}
        name={section.name}
        stories={section.stories}
        isFirst={index === 0}
      />
    ));
  };

  return (
    <section className="flex flex-1 flex-col gap-8 pt-2 pb-6">
      {renderContent()}
    </section>
  );
}
