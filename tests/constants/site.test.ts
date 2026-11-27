import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TITLE,
  formatDocumentTitle,
  serializeStructuredData,
  SITE_BUSINESS_INFO,
  SITE_CONTACT_EMAIL,
  SITE_STRUCTURED_DATA,
  SITE_URL,
} from '@/constants/site';

describe('formatDocumentTitle', () => {
  it('화면 제목 뒤에 서비스명을 붙인다', () => {
    expect(formatDocumentTitle('용의 계곡')).toBe('용의 계곡 - 마냑');
  });

  it('제목이 비면 기본 문서 제목을 남긴다', () => {
    expect(formatDocumentTitle('')).toBe(DEFAULT_TITLE);
  });
});

describe('SITE_STRUCTURED_DATA', () => {
  it('WebSite에 브랜드명과 로마자 alternateName을 선언한다', () => {
    const webSite = SITE_STRUCTURED_DATA['@graph'].find(
      (node) => node['@type'] === 'WebSite',
    );

    expect(webSite?.name).toBe('마냑');
    expect(webSite?.alternateName).toContain('manyak');
    expect(webSite?.url).toBe(SITE_URL);
  });

  it('Organization을 절대 URL 로고와 함께 선언한다', () => {
    const organization = SITE_STRUCTURED_DATA['@graph'].find(
      (node) => node['@type'] === 'Organization',
    );

    expect(organization?.logo).toBe(`${SITE_URL}/logo/manyak-logo.svg`);
  });

  it('Organization의 sameAs가 공식 SNS 프로필을 가리킨다', () => {
    const organization = SITE_STRUCTURED_DATA['@graph'].find(
      (node) => node['@type'] === 'Organization',
    );

    expect(organization?.sameAs).toContain(
      'https://www.instagram.com/manyak.story/',
    );
  });
});

describe('serializeStructuredData', () => {
  it('스크립트 조기 종료를 막도록 < 를 이스케이프하고 유효한 JSON을 유지한다', () => {
    const serialized = serializeStructuredData();

    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(SITE_STRUCTURED_DATA);
  });
});

describe('SITE_BUSINESS_INFO', () => {
  it('전자상거래법이 요구하는 사업자 정보를 표시 순서대로 갖는다', () => {
    expect(SITE_BUSINESS_INFO.map(({ label }) => label)).toEqual([
      '상호',
      '대표',
      '사업자등록번호',
      '통신판매업 신고번호',
      '주소',
      '전화',
      '이메일',
    ]);
    expect(SITE_BUSINESS_INFO.every(({ value }) => value.length > 0)).toBe(
      true,
    );
  });

  it('사업자 정보의 이메일은 공식 문의 이메일과 같다', () => {
    expect(
      SITE_BUSINESS_INFO.find(({ label }) => label === '이메일')?.value,
    ).toBe(SITE_CONTACT_EMAIL);
  });
});
