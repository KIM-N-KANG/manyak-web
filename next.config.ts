import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

import { APP_PATH } from './src/constants/app-path';

const nextConfig: NextConfig = {
  // Vercel 배포 여부를 클라이언트 번들에서도 읽을 수 있게 빌드 시점에 인라인한다.
  // Sentry 게이팅이 로컬 프로덕션 빌드(pnpm build && pnpm start)를 배포와 구분하는 데 쓴다.
  // 대시보드의 시스템 환경 변수 노출 설정에 의존하지 않도록 직접 주입한다.
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV,
  },
  // 핸드오프 랜딩은 URL에 일회용 코드를 달고 열린다. 코드가 주소에 남아 있는 동안
  // 이 문서에서 나가는 모든 요청이 Referer로 코드를 흘리지 않도록 no-referrer를 걸고,
  // 응답이 중간 캐시에 남지 않도록 no-store를 함께 지정한다(정적 프리렌더는 유지된다).
  async headers() {
    return [
      {
        source: APP_PATH.LOGIN_CONTINUE,
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
  // 실기기 dev 테스트용 교차 출처 허용 목록. 개발자별 터널 도메인·LAN IP는
  // 로컬 값이므로 코드에 하드코딩하지 않고 .env.local의 ALLOWED_DEV_ORIGINS
  // (콤마 구분)로 주입한다.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  output: 'standalone',
  reactCompiler: true,
  compiler: {
    // 프로덕션 빌드에서 콘솔 로그를 제거하되, debug 레벨은 남긴다.
    // 분석 비활성 환경(키 미주입 CI E2E·Vercel Preview)에서 track()이
    // console.debug로 이벤트를 대체 출력하는 계약을 유지하기 위함이다.
    removeConsole: process.env.NODE_ENV === 'production' && {
      exclude: ['debug'],
    },
  },
  images: {
    // 프로필 이미지 원격 호스트 화이트리스트. 백엔드가 자체 스토리지로
    // 이미지를 내려주기로 바뀌면 해당 호스트를 여기에 추가한다.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        // 프로필 프리셋 이미지(KNK-388, B17). 백엔드가 명사 매핑 프리셋을
        // static 리소스로 서빙하며 me.profileImageUrl에 전체 URL이 실린다.
        protocol: 'https',
        hostname: 'api.manyak.app',
        pathname: '/profile-presets/**',
      },
      {
        // 개발 백엔드도 환경별 base URL로 같은 프로필 프리셋을 서빙한다(KNK-832).
        protocol: 'https',
        hostname: 'dev-api.manyak.app',
        pathname: '/profile-presets/**',
      },
      {
        // 스토리 썸네일(KNK-552). 백엔드가 CDN으로 서빙하며
        // story.thumbnailUrl에 전체 URL이 실린다.
        protocol: 'https',
        hostname: 'cdn.manyak.app',
        pathname: '/thumbnails/**',
      },
      {
        // 채팅 인물 이미지(KNK-1013). 저장 마커와 SSE 이벤트 모두
        // 백엔드가 검증·저장한 생성 이미지 URL만 전달한다.
        protocol: 'https',
        hostname: 'cdn.manyak.app',
        pathname: '/characters/generated/**',
      },
      {
        // 개발 환경은 별도 CloudFront 도메인에서 같은 생성 이미지 경로를 서빙한다.
        protocol: 'https',
        hostname: 'dev-cdn.manyak.app',
        pathname: '/characters/generated/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'manyak',

  project: 'typescript-nextjs',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
