import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendCampaignParams,
  isAmplitudeMarketingCookieName,
  parseAmplitudeMarketingCookieValue,
  readCampaignParams,
} from '@/observability/analytics/campaign-params';

// Amplitude가 저장하는 쿠키와 같은 형식(base64 → URL 인코드 → JSON)으로 만든다.
const mktgCookieValue = (campaign: Record<string, unknown>) =>
  btoa(encodeURIComponent(JSON.stringify(campaign)));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isAmplitudeMarketingCookieName', () => {
  it('마케팅 쿠키 이름을 식별한다', () => {
    expect(isAmplitudeMarketingCookieName('AMP_MKTG_abc1234567')).toBe(true);
  });

  it('웹 실험용 AMP_MKTG_ORIGINAL_ 쿠키는 제외한다', () => {
    expect(isAmplitudeMarketingCookieName('AMP_MKTG_ORIGINAL_abc1234567')).toBe(
      false,
    );
  });

  it('식별자 쿠키와 무관한 쿠키는 제외한다', () => {
    expect(isAmplitudeMarketingCookieName('AMP_abc1234567')).toBe(false);
    expect(isAmplitudeMarketingCookieName('session')).toBe(false);
  });
});

describe('parseAmplitudeMarketingCookieValue', () => {
  it('UTM 계열 6종을 읽는다', () => {
    const raw = mktgCookieValue({
      utm_source: 'ig',
      utm_medium: 'paid',
      utm_campaign: 'KR_META_WEB_ACTIVATION_COLD_202608',
      utm_term: 'romance',
      utm_content: 'video-a',
      utm_id: '120210',
    });

    expect(parseAmplitudeMarketingCookieValue(raw)).toEqual({
      utm_source: 'ig',
      utm_medium: 'paid',
      utm_campaign: 'KR_META_WEB_ACTIVATION_COLD_202608',
      utm_term: 'romance',
      utm_content: 'video-a',
      utm_id: '120210',
    });
  });

  it('UTM이 아닌 키는 싣지 않는다', () => {
    const raw = mktgCookieValue({
      utm_source: 'ig',
      referrer: 'https://instagram.com/',
      referring_domain: 'instagram.com',
      fbclid: 'abc',
      gclid: 'def',
    });

    expect(parseAmplitudeMarketingCookieValue(raw)).toEqual({
      utm_source: 'ig',
    });
  });

  it('빈 문자열은 값이 없는 것으로 본다', () => {
    // Amplitude는 캠페인 없는 진입에 빈 문자열을 써 넣으므로, 그대로 실으면
    // 외부 브라우저에 utm_source= 같은 빈 파라미터가 붙는다.
    const raw = mktgCookieValue({ utm_source: '', utm_campaign: 'summer' });

    expect(parseAmplitudeMarketingCookieValue(raw)).toEqual({
      utm_campaign: 'summer',
    });
  });

  it('문자열이 아닌 값은 무시한다', () => {
    const raw = mktgCookieValue({ utm_source: 123, utm_campaign: null });

    expect(parseAmplitudeMarketingCookieValue(raw)).toEqual({});
  });

  it('손상된 값은 빈 객체를 반환한다', () => {
    expect(
      parseAmplitudeMarketingCookieValue('not-a-valid-base64-json'),
    ).toEqual({});
  });

  it('객체가 아닌 JSON은 빈 객체를 반환한다', () => {
    expect(
      parseAmplitudeMarketingCookieValue(btoa(encodeURIComponent('"plain"'))),
    ).toEqual({});
  });
});

describe('appendCampaignParams', () => {
  it('쿼리가 있는 URL에 이어 붙인다', () => {
    expect(
      appendCampaignParams('/login/continue?handoff=code-1', {
        utm_source: 'ig',
        utm_campaign: 'summer',
      }),
    ).toBe('/login/continue?handoff=code-1&utm_source=ig&utm_campaign=summer');
  });

  it('쿼리가 없는 URL에는 물음표로 시작한다', () => {
    expect(appendCampaignParams('/login/continue', { utm_source: 'ig' })).toBe(
      '/login/continue?utm_source=ig',
    );
  });

  it('실을 값이 없으면 URL을 그대로 둔다', () => {
    expect(appendCampaignParams('/login/continue?handoff=code-1', {})).toBe(
      '/login/continue?handoff=code-1',
    );
  });

  it('값을 URL 인코딩한다', () => {
    expect(
      appendCampaignParams('/login/continue', { utm_campaign: 'a b&c' }),
    ).toBe('/login/continue?utm_campaign=a+b%26c');
  });
});

describe('readCampaignParams', () => {
  it('AMP_MKTG_ 쿠키에서 캠페인 파라미터를 읽는다', () => {
    vi.stubGlobal('document', {
      cookie: `other=x; AMP_MKTG_abc1234567=${mktgCookieValue({
        utm_source: 'ig',
      })}`,
    });

    expect(readCampaignParams()).toEqual({ utm_source: 'ig' });
  });

  it('마케팅 쿠키가 없으면 빈 객체를 반환한다', () => {
    vi.stubGlobal('document', { cookie: 'other=x' });

    expect(readCampaignParams()).toEqual({});
  });

  it('브라우저가 아니면 빈 객체를 반환한다', () => {
    expect(readCampaignParams()).toEqual({});
  });
});
