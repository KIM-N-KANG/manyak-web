import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
// 로컬 개발 서버(3000)와 나란히 돌 수 있도록 E2E 전용 포트를 쓴다.
const E2E_PORT = 3100;
const baseURL = `http://localhost:${E2E_PORT}`;
const seoServer = process.env.E2E_SEO === '1';
const captureScreens = process.env.UI_CAPTURE === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // 로컬 기본값(코어의 절반)은 워커가 너무 많아 커밋 직전 실행이 머신을 점유한다.
  // CI 러너(ubuntu-latest, public 레포)는 4 vCPU라 같은 값으로 맞춘다.
  workers: 4,
  // 실행 산출물(결과, HTML 리포트, 화면 캡처)은 루트의 `.playwright/` 한 곳에 모은다.
  outputDir: '.playwright/results',
  reporter: [['html', { outputFolder: '.playwright/report' }]],
  // 화면 캡처 스펙(`e2e/ui-capture`)의 `toHaveScreenshot` 설정이다.
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
      testMatch:
        /(?:smoke\/.*|auth\/in-app-login|my\/profile|stories\/story-edit|stories\/story-create-draft|stories\/story-creation-storage)\.spec\.ts/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'Mobile Chrome',
      testIgnore: /ui-capture\/.*\.spec\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    // 화면 캡처는 테스트가 아니라 UI 검사(ui-review 스킬)의 입력이라 CI와 기본 실행에서 뺀다.
    // `pnpm ui:capture`는 기존 캡처를 덮어쓰고, `pnpm ui:compare`는 직전 캡처와 비교해 바뀐 화면의 diff를 남긴다.
    ...(captureScreens
      ? [
          {
            name: 'ui-capture',
            testMatch: /ui-capture\/.*\.spec\.ts/,
            snapshotPathTemplate:
              '.playwright/capture/{testFileName}/{arg}{ext}',
            use: { ...devices['Pixel 5'] },
          },
        ]
      : []),
  ],
  webServer: [
    ...(seoServer
      ? [
          {
            command: 'node e2e/fixtures/seo-backend.mjs',
            url: 'http://127.0.0.1:3199',
            reuseExistingServer: false,
          },
        ]
      : []),
    {
      // 개발 서버는 라우트를 첫 요청마다 컴파일해 여러 워커 아래서 CPU를 점유하고,
      // Next 16은 같은 프로젝트의 두 번째 `next dev`를 거부해 켜 둔 개발 서버와 충돌한다.
      // 그래서 기본은 프로덕션 서버이고, 스펙 몇 개를 반복할 때만 `E2E_DEV=1`로 개발 서버를 쓴다.
      command:
        !isCI && process.env.E2E_DEV ? 'pnpm dev' : 'pnpm build && pnpm start',
      url: baseURL,
      // E2E 환경 변수가 적용되지 않은 일반 개발 서버를 재사용하지 않는다.
      reuseExistingServer: false,
      timeout: 120_000,
      // 기본 E2E는 API_BASE_URL을 비워 서버 조회를 클라이언트 폴백으로 고정한다.
      // E2E_SEO=1만 테스트 백엔드를 사용해 첫 HTML과 브라우저 조회를 함께 검증한다.
      // 로컬 .env.local의 분석 및 모니터링 키가 프로덕션 빌드에 인라인되면 track()이 console.debug 대신
      // 실제 Amplitude로 나가고 Sentry에 E2E 오류가 쌓인다. CI(키 없음)와 같게 비워 둔다.
      env: {
        API_BASE_URL: seoServer ? 'http://127.0.0.1:3199' : '',
        E2E: '1',
        PORT: String(E2E_PORT),
        NEXT_PUBLIC_AMPLITUDE_API_KEY: '',
        NEXT_PUBLIC_SENTRY_DSN: '',
        NEXT_PUBLIC_SENTRY_FORCE_ENABLE: '',
        // 웹 푸시는 VAPID 키가 비면 SW 등록과 토큰 발급, 프롬프트가 모두 꺼진다.
        // 로컬 .env.local의 Firebase 키가 인라인되면 E2E가 실제 FCM으로 나가므로 CI와 같게 비운다.
        NEXT_PUBLIC_FIREBASE_VAPID_KEY: '',
      },
    },
  ],
});
