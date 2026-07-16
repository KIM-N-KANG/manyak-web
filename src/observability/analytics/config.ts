/**
 * API 키가 있고 production 환경일 때만 분석 전송을 활성화한다.
 *
 * @param input apiKey(Amplitude API 키)와 nodeEnv(빌드 환경)를 담은 객체
 * @returns 분석 전송 활성화 여부
 */
export function resolveAnalyticsEnabled(input: {
  apiKey?: string;
  nodeEnv?: string;
}): boolean {
  return Boolean(input.apiKey) && input.nodeEnv === 'production';
}

/** Amplitude 프로젝트 API 키. 미설정 환경에서는 undefined. */
export const ANALYTICS_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

/** 현재 빌드 환경에서 분석 전송이 활성화됐는지 여부. */
export const IS_ANALYTICS_ENABLED = resolveAnalyticsEnabled({
  apiKey: ANALYTICS_API_KEY,
  nodeEnv: process.env.NODE_ENV,
});

/** 이벤트에 실을 앱 버전. 빌드 시 주입되며 로컬에서는 'dev'. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
