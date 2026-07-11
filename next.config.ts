import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.28'],
  output: 'standalone',
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
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
        // 스토리 썸네일(KNK-552). 백엔드가 CDN으로 서빙하며
        // story.thumbnailUrl에 전체 URL이 실린다.
        protocol: 'https',
        hostname: 'cdn.manyak.app',
        pathname: '/thumbnails/**',
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
