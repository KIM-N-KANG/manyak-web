import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME } from '@/constants/site';

/**
 * PWA 웹 앱 매니페스트. 홈 화면 설치와 standalone 표시를 위한 최소 구성이다.
 * iOS는 홈 화면 설치본에서만 웹 푸시를 받을 수 있어 매니페스트가 푸시의 전제다.
 * `/icons/icon-192.png`는 서버 웹 푸시 아이콘 기본 URL과 같은 경로여야 한다.
 *
 * @returns 웹 앱 매니페스트
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'ko',
    start_url: '/',
    display: 'standalone',
    background_color: '#fcfcfc',
    theme_color: '#fcfcfc',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
