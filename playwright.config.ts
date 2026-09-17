import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
// 로컬 개발 서버(3000)와 나란히 돌 수 있도록 E2E 전용 포트를 쓴다.
const E2E_PORT = 3100;
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // 로컬 기본값(코어의 절반)은 워커가 너무 많아 커밋 직전 실행이 머신을 점유한다.
  // CI 러너(ubuntu-latest, public 레포)는 4 vCPU라 같은 값으로 맞춘다.
  workers: 4,
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
    // 개발 서버는 라우트를 첫 요청마다 컴파일해 여러 워커 아래서 CPU를 점유하고,
    // Next 16은 같은 프로젝트의 두 번째 `next dev`를 거부해 켜 둔 개발 서버와 충돌한다.
    // 그래서 기본은 프로덕션 서버이고, 스펙 몇 개를 반복할 때만 `E2E_DEV=1`로 개발 서버를 쓴다.
    command:
      !isCI && process.env.E2E_DEV ? 'pnpm dev' : 'pnpm build && pnpm start',
    url: baseURL,
    // E2E 환경 변수가 적용되지 않은 일반 개발 서버를 재사용하지 않는다.
    reuseExistingServer: false,
    timeout: 120_000,
    // 브라우저 요청은 fixture가 전부 목킹하지만, 서버 렌더·메타데이터·사이트맵은 Next 서버가
    // API_BASE_URL로 백엔드를 직접 읽는다. 로컬 .env.local의 실서버가 섞이면 홈 SSR 데이터가
    // 목과 어긋나므로 비워서 서버 조회를 항상 실패(클라이언트 폴백)로 고정한다.
    // 로컬 .env.local의 분석·모니터링 키가 프로덕션 빌드에 인라인되면 track()이 console.debug 대신
    // 실제 Amplitude로 나가고 Sentry에 E2E 오류가 쌓인다. CI(키 없음)와 같게 비워 둔다.
    env: {
      API_BASE_URL: '',
      E2E: '1',
      PORT: String(E2E_PORT),
      NEXT_PUBLIC_AMPLITUDE_API_KEY: '',
      NEXT_PUBLIC_SENTRY_DSN: '',
      NEXT_PUBLIC_SENTRY_FORCE_ENABLE: '',
    },
  },
});
