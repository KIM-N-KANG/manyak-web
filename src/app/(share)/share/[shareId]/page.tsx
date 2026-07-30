import type { Metadata } from 'next';

import { DEFAULT_TITLE, SITE_NAME } from '@/constants/site';
import { SharedChatScreen } from '@/features/shares/components/shared-chat-screen';
import { truncateForDescription } from '@/features/shares/utils/share-description';
import {
  fetchSharedChatForMetadata,
  fetchStoryThumbnailForMetadata,
} from '@/lib/shares/backend-share-client';

type SharedChatPageProps = {
  params: Promise<{ shareId: string }>;
};

/** 조회할 수 없는 공유 URL이 검색 결과에 남지 않도록 색인을 막는다. */
const UNAVAILABLE_SHARE_ROBOTS = { index: false, follow: false };

/**
 * 공유본을 읽어 링크 미리보기용 메타데이터를 만든다.
 *
 * 조회에 실패하면 제목·설명 없이 색인 차단만 담은 기본값을 반환한다. 미리보기가
 * 비는 것과 페이지가 뜨지 않는 것 중에서는 전자가 낫다.
 *
 * @param props 라우트 파라미터를 담은 페이지 props
 * @returns 스토리 제목·프롤로그가 반영된 메타데이터
 */
export async function generateMetadata({
  params,
}: SharedChatPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const share = await fetchSharedChatForMetadata(shareId);

  if (!share) {
    return { robots: UNAVAILABLE_SHARE_ROBOTS };
  }

  const storyTitle = share.storyTitle ?? '';
  const description = truncateForDescription(share.prologue);
  // 공유 응답에는 썸네일이 없어 스토리 상세에서 가져온다. 없으면 루트의 브랜드
  // 오픈그래프 이미지가 그대로 쓰인다.
  const thumbnailUrl = share.storyId
    ? await fetchStoryThumbnailForMetadata(share.storyId)
    : null;

  return {
    // 제목이 비면 템플릿 접미사만 남으므로 그때는 기본 문서 제목을 절대값으로 둔다.
    title: storyTitle || { absolute: DEFAULT_TITLE },
    description,
    openGraph: {
      title: storyTitle || SITE_NAME,
      description,
      ...(thumbnailUrl ? { images: [thumbnailUrl] } : {}),
    },
  };
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  const { shareId } = await params;

  return <SharedChatScreen shareId={shareId} />;
}
