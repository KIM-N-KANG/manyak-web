import type { Metadata } from 'next';

import { SITE_NAME } from '@/constants/site';
import { SharedChatScreen } from '@/features/shares/components/shared-chat-screen';
import { truncateForDescription } from '@/features/shares/utils/share-description';
import { fetchSharedChatForMetadata } from '@/lib/shares/backend-share-client';

type SharedChatPageProps = {
  params: Promise<{ shareId: string }>;
};

/**
 * 공유 링크는 개인의 플레이 기록이라 검색 색인은 막는다. 링크 미리보기 스크래퍼는
 * 이 값과 무관하게 오픈그래프 태그를 읽으므로 미리보기 카드에는 영향이 없다.
 */
const SHARE_ROBOTS = { index: false, follow: false };

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
    return { robots: SHARE_ROBOTS };
  }

  const storyTitle = share.storyTitle ?? '';
  const description = truncateForDescription(share.prologue);

  return {
    // 제목이 비면 템플릿 접미사만 남으므로 그때는 서비스명만 절대값으로 둔다.
    title: storyTitle || { absolute: SITE_NAME },
    description,
    robots: SHARE_ROBOTS,
    openGraph: { title: storyTitle || SITE_NAME, description },
  };
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  const { shareId } = await params;

  return <SharedChatScreen shareId={shareId} />;
}
