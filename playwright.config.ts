import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // 로컬 기본값(코어의 절반)은 워커가 너무 많아 커밋 직전 실행이 머신을 점유한다.
  // CI는 러너가 작아 직렬로 돌린다.
  workers: isCI ? 1 : 4,
  reporter: 'html',
  // 스냅샷 기준 이미지는 CI(Linux) 렌더링만 정본으로 관리한다.
  // 로컬(macOS)은 폰트·안티앨리어싱이 달라 비교를 건너뛰고 플로우만 실행한다.
  // 기준 이미지 갱신은 `pnpm test:e2e:visual:update`(Docker, CI와 동일 이미지)로 한다.
  ignoreSnapshots: !isCI,
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/__screenshots__/{testFileName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Mobile Chrome',
      // 비주얼 스펙은 로컬에서 스냅샷 비교(ignoreSnapshots)가 꺼져 있어 플로우만 돌고 검증은 남지 않는다.
      // 그래서 로컬 기본 실행에서는 제외하고 CI와 `pnpm test:e2e:visual:update`(CI=1)에서만 돌린다.
      testIgnore: isCI ? undefined : /visual\/.*\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: isCI ? 'pnpm build && pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    // 브라우저 요청은 fixture가 전부 목킹하지만, 서버 렌더·메타데이터·사이트맵은 Next 서버가
    // API_BASE_URL로 백엔드를 직접 읽는다. 로컬 .env.local의 실서버가 섞이면 홈 SSR 데이터가
    // 목과 어긋나므로 비워서 서버 조회를 항상 실패(클라이언트 폴백)로 고정한다.
    // 이미 떠 있는 dev 서버를 재사용하는 경우(reuseExistingServer)에는 적용되지 않는다.
    env: { API_BASE_URL: '' },
  },
});
