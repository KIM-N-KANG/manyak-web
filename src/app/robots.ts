import type { MetadataRoute } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { SITE_URL } from '@/constants/site';

/**
 * 검색 크롤러 수집 규칙. 개인화 화면과 인증·생성 플로우는 수집에서 제외한다.
 *
 * `/onboarding`은 의도적으로 Disallow 하지 않는다 — 이미 색인된 온보딩 URL을
 * 색인에서 빼려면 크롤러가 페이지의 noindex 메타를 읽을 수 있어야 한다.
 *
 * @returns `robots.txt`로 직렬화될 수집 규칙
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        APP_PATH.MAIN.CHATS,
        APP_PATH.MAIN.MY,
        APP_PATH.LOGIN,
        // 스토리 상세·생성 플로우. 사용자 생성물 노출은 프라이버시 검토 전까지 제외한다.
        '/stories/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
