import type { Metadata, ResolvingMetadata } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { DEFAULT_TITLE, SITE_NAME } from '@/constants/site';
import { StoryDetail } from '@/features/stories/detail/components/story-detail';
import { fetchOriginalStoryOnServer } from '@/lib/stories/backend-story-client';

type StoryDetailPageProps = {
  params: Promise<{ id: string }>;
};

/** 오리지널이 아닌(사용자 생성) 스토리와 조회 실패는 검색 결과에 남지 않도록 색인을 막는다. */
const NOINDEX_ROBOTS = { index: false, follow: false };

/**
 * 오리지널 스토리에만 검색 색인과 링크 미리보기 메타데이터를 만든다.
 *
 * 목록과 현재 공개 상세를 모두 읽어야 색인을 허용한다.
 *
 * @param props 라우트 파라미터를 담은 페이지 props
 * @param parent 루트에서 상속한 메타데이터
 * @returns 공개 오리지널 메타데이터 또는 색인 차단 지시
 */
export async function generateMetadata(
  { params }: StoryDetailPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id } = await params;
  const story = await fetchOriginalStoryOnServer(id);

  if (!story) {
    return { robots: NOINDEX_ROBOTS };
  }

  const title = story.title ?? '';
  const description = story.oneLineIntro || undefined;
  const thumbnailUrl = story.thumbnailUrl;
  const images = thumbnailUrl
    ? [thumbnailUrl]
    : (await parent).openGraph?.images;

  return {
    title: title || { absolute: DEFAULT_TITLE },
    description,
    alternates: { canonical: APP_PATH.STORY_DETAIL(id) },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ko_KR',
      title: title || SITE_NAME,
      description,
      url: APP_PATH.STORY_DETAIL(id),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: title || SITE_NAME,
      description,
      images,
    },
  };
}

export default async function StoryDetailPage({
  params,
}: StoryDetailPageProps) {
  const { id } = await params;
  const initialStory = await fetchOriginalStoryOnServer(id);

  return <StoryDetail storyId={id} initialStory={initialStory ?? undefined} />;
}
