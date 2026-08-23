import { AMP_MKTG_COOKIE_PREFIX } from './amplitude-identity';

/**
 * 인앱 브라우저에서 외부 브라우저로 넘길 캠페인 파라미터 키.
 * Amplitude가 수집하는 값 중 UTM 계열만 싣는다 — referrer는 URL로 위조 전달할 수단이
 * 없고, 클릭 ID(fbclid 등)는 현재 Meta 전환 이벤트가 전부 인앱에서 발화해 쓰이지 않는다.
 */
export const CAMPAIGN_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
] as const;

/** 전환 URL에 실어 나르는 캠페인 파라미터 키. */
export type CampaignParamKey = (typeof CAMPAIGN_PARAM_KEYS)[number];

/** 쿠키에서 읽어낸 캠페인 파라미터. 값이 없는 키는 담지 않는다. */
export type CampaignParams = Partial<Record<CampaignParamKey, string>>;

/** 웹 실험이 최초 캠페인을 따로 보관하는 쿠키의 접두사. 현재 캠페인 쿠키와 구분해야 한다. */
const AMP_MKTG_ORIGINAL_COOKIE_PREFIX = 'AMP_MKTG_ORIGINAL_';

/**
 * 쿠키 이름이 Amplitude 캠페인 쿠키인지 판별한다.
 * SDK는 `AMP_MKTG_{apiKey}`와 `AMP_MKTG_ORIGINAL_{apiKey}`를 함께 쓰므로, 접두사만
 * 보면 둘 다 걸린다. 현재 캠페인을 담는 앞의 것만 고른다.
 *
 * @param name 검사할 쿠키 이름
 * @returns Amplitude 캠페인 쿠키면 true
 */
export function isAmplitudeMarketingCookieName(name: string): boolean {
  return (
    name.startsWith(AMP_MKTG_COOKIE_PREFIX) &&
    !name.startsWith(AMP_MKTG_ORIGINAL_COOKIE_PREFIX)
  );
}

/**
 * Amplitude SDK가 저장한 캠페인 쿠키에서 UTM 값을 파싱한다. 값 형식(base64 → URL 디코드
 * → JSON)은 SDK 구현 세부사항이라 파싱 실패 시 빈 값을 반환한다 — 그 경우 파라미터를
 * 붙이지 않아 기존 동작으로 degrade할 뿐이다.
 *
 * 빈 문자열은 값이 없는 것으로 본다. Amplitude는 캠페인 없는 진입에 빈 문자열을 써
 * 넣는데, 그대로 실으면 외부 브라우저에 빈 파라미터가 붙어 오히려 귀속을 지운다.
 *
 * @param rawValue 쿠키에 저장된 원본 값
 * @returns 파싱한 UTM 파라미터(파싱 실패 시 빈 객체)
 */
export function parseAmplitudeMarketingCookieValue(
  rawValue: string,
): CampaignParams {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(atob(rawValue)));

    if (typeof parsed !== 'object' || parsed === null) return {};

    const campaign = parsed as Record<string, unknown>;
    const params: CampaignParams = {};

    for (const key of CAMPAIGN_PARAM_KEYS) {
      const value = campaign[key];

      if (typeof value === 'string' && value !== '') {
        params[key] = value;
      }
    }

    return params;
  } catch {
    return {};
  }
}

/**
 * 브라우저 쿠키에서 캠페인 파라미터를 읽는다. 분석이 비활성화된 환경에는 쿠키가 없어
 * 빈 객체를 반환한다.
 *
 * @returns 쿠키에서 읽은 UTM 파라미터(쿠키가 없거나 서버 환경이면 빈 객체)
 */
export function readCampaignParams(): CampaignParams {
  if (typeof document === 'undefined') return {};

  const entry = document.cookie.split('; ').find((cookie) => {
    const separatorIndex = cookie.indexOf('=');
    const name =
      separatorIndex === -1 ? cookie : cookie.slice(0, separatorIndex);

    return isAmplitudeMarketingCookieName(name);
  });

  if (!entry) return {};

  return parseAmplitudeMarketingCookieValue(
    entry.slice(entry.indexOf('=') + 1),
  );
}

/**
 * URL에 캠페인 파라미터를 이어 붙인다. 값이 있는 키만 싣고, 실을 값이 없으면 URL을
 * 그대로 돌려준다.
 *
 * @param url 파라미터를 붙일 URL(앱 내 상대 경로)
 * @param params 실을 캠페인 파라미터
 * @returns 캠페인 파라미터가 붙은 URL
 */
export function appendCampaignParams(
  url: string,
  params: CampaignParams,
): string {
  const entries = CAMPAIGN_PARAM_KEYS.flatMap((key) => {
    const value = params[key];

    return value ? [[key, value]] : [];
  });

  if (entries.length === 0) return url;

  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}${new URLSearchParams(entries).toString()}`;
}
