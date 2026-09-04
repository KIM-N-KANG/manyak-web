import type { Metadata } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { DEFAULT_TITLE, SITE_NAME } from '@/constants/site';
import { StoryDetail } from '@/features/stories/detail/components/story-detail';
import { fetchStoryThumbnailForMetadata } from '@/lib/shares/backend-share-client';
import { fetchOriginalStoriesOnServer } from '@/lib/stories/backend-story-client';

type StoryDetailPageProps = {
  params: Promise<{ id: string }>;
};

/** 오리지널이 아닌(사용자 생성) 스토리와 조회 실패는 검색 결과에 남지 않도록 색인을 막는다. */
const NOINDEX_ROBOTS = { index: false, follow: false };

/**
 * 오리지널 스토리에만 검색 색인과 링크 미리보기 메타데이터를 만든다.
 *
 * robots.txt가 `/stories/`를 더 이상 막지 않으므로 색인 여부는 이 메타데이터가 정한다.
 * 오리지널 판별은 별도 플래그가 없어 공개 오리지널 목록에 포함되는지로 한다. 목록 조회에
 * 실패하면 판별할 수 없으므로 안전한 쪽(noindex)으로 응답한다 — 크롤러는 다시 방문한다.
 *
 * @param props 라우트 파라미터를 담은 페이지 props
 * @returns 오리지널이면 제목·한 줄 소개·썸네일이 반영된 메타데이터, 아니면 색인 차단
 */
export async function generateMetadata({
  params,
}: StoryDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const originals = await fetchOriginalStoriesOnServer();
  const story = originals?.find((candidate) => candidate.id === id);

  if (!story) {
    return { robots: NOINDEX_ROBOTS };
  }

  const title = story.title ?? '';
  const description = story.oneLineIntro;
  // 목록 응답의 썸네일은 카드용 축소본이라 미리보기에는 상세의 원본을 쓴다.
  const thumbnailUrl = await fetchStoryThumbnailForMetadata(id);

  return {
    title: title || { absolute: DEFAULT_TITLE },
    description,
    alternates: { canonical: APP_PATH.STORY_DETAIL(id) },
    openGraph: {
      title: title || SITE_NAME,
      description,
      url: APP_PATH.STORY_DETAIL(id),
      ...(thumbnailUrl ? { images: [thumbnailUrl] } : {}),
    },
  };
}

export default async function StoryDetailPage({
  params,
}: StoryDetailPageProps) {
  const { id } = await params;

  return <StoryDetail storyId={id} />;
}
