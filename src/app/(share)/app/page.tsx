import type { Metadata, ResolvingMetadata } from 'next';

import { APP_PATH } from '@/constants/app-path';
import {
  DEFAULT_TITLE,
  HOME_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/constants/site';
import { AppShareScreen } from '@/features/app/components/app-share-screen';

/**
 * 메신저 공유 미리보기용 메타데이터를 만든다. 플레이스토어 페이지는 카카오톡 스크래퍼에
 * OG를 주지 않아 이 경로가 대신한다. 루트의 브랜드 이미지를 유지하고 홈과 같은 설명을 쓴다.
 * 공유 전용 경로라 검색 색인은 막는다.
 *
 * @param _props 페이지 props
 * @param parent 루트에서 상속한 메타데이터
 * @returns 공유 미리보기 메타데이터
 */
export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { openGraph, twitter } = await parent;
  const url = `${SITE_URL}${APP_PATH.APP}`;

  return {
    title: { absolute: DEFAULT_TITLE },
    description: HOME_DESCRIPTION,
    robots: { index: false, follow: true },
    openGraph: {
      ...openGraph,
      title: SITE_NAME,
      description: HOME_DESCRIPTION,
      url,
    },
    twitter: {
      ...twitter,
      card: 'summary_large_image',
      title: SITE_NAME,
      description: HOME_DESCRIPTION,
    },
  };
}

export default function AppSharePage() {
  return <AppShareScreen />;
}
