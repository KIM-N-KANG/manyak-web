export function resolveAnalyticsEnabled(input: {
  apiKey?: string;
  nodeEnv?: string;
}): boolean {
  return Boolean(input.apiKey) && input.nodeEnv === 'production';
}

export const ANALYTICS_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;

export const IS_ANALYTICS_ENABLED = resolveAnalyticsEnabled({
  apiKey: ANALYTICS_API_KEY,
  nodeEnv: process.env.NODE_ENV,
});

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';
