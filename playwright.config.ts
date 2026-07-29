import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// 로컬은 개발 중인 3000 dev 서버와 겹치지 않게 전용 포트에 항상 새 서버를 띄운다.
// 3000을 재사용하면 오래 떠 있던 dev 서버 상태(react-grab 등)가 결과를 오염시킨다.
// CI는 러너에 다른 서버가 없으므로 기본 포트를 그대로 쓴다.
const port = isCI ? 3000 : 3100;
const baseURL = `http://localhost:${port}`;

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
    baseURL,
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
    command: isCI ? 'pnpm build && pnpm start' : `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    // dev 서버와 .next를 공유하면 Next의 단일 인스턴스 잠금에 걸리고 산출물도
    // 서로 오염되므로, 로컬 E2E 서버는 전용 산출물 폴더를 쓴다(next.config.ts).
    env: isCI ? {} : { NEXT_DIST_DIR: '.next-e2e' },
  },
});
