import type { MetadataRoute } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { SITE_URL } from '@/constants/site';

/**
 * 정적 공개 페이지 목록. 개인화·인증 화면은 색인 대상이 아니므로 넣지 않는다.
 * lastModified는 빌드 시각을 넣으면 배포마다 갱신된 것처럼 보여 생략한다.
 *
 * @returns `sitemap.xml`로 직렬화될 URL 목록
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [APP_PATH.MAIN.STORIES, APP_PATH.TERMS, APP_PATH.PRIVACY].map(
    (path) => ({
      url: new URL(path, SITE_URL).toString(),
    }),
  );
}
