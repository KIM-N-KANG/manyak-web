import type { MetadataRoute } from 'next';

import { APP_PATH } from '@/constants/app-path';
import { SITE_URL } from '@/constants/site';

/**
 * 검색 크롤러 수집 규칙. 개인화 화면과 인증·생성 플로우는 수집에서 제외한다.
 *
 * `/onboarding`과 `/stories/`는 의도적으로 Disallow 하지 않는다 — 색인 여부를 페이지의
 * robots 메타가 정하므로(온보딩은 noindex, 스토리 상세는 오리지널만 색인 허용) 크롤러가
 * 페이지를 읽을 수 있어야 한다. robots.txt로 막으면 그 지시를 읽지 못해 기존 색인이 남는다.
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
        APP_PATH.MAIN.STUDIO,
        APP_PATH.MAIN.MY,
        APP_PATH.LOGIN,
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
