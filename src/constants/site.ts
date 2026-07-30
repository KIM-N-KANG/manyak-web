/**
 * 서비스 대표 오리진. 메타데이터(metadataBase·OG)와 robots·sitemap이 공유한다.
 */
export const SITE_URL = 'https://manyak.app';

/**
 * 서비스 이름. 메타데이터와 문서 제목 접미사가 공유한다.
 */
export const SITE_NAME = '마냑';

/**
 * 서비스 한 줄 소개. 메타데이터 description과 OG·트위터 카드가 공유한다.
 */
export const SITE_DESCRIPTION =
  '나만의 스토리를 만들고 채팅으로 이어나가는 AI 스토리챗 서비스';

/**
 * 기본 문서 제목. 고유 제목이 없는 화면(홈 포함)이 공유한다.
 * 브랜드명 단독으로는 검색엔진이 서비스 성격을 알 수 없어 카테고리 문구를 붙인다.
 */
export const DEFAULT_TITLE = `${SITE_NAME} - 나만의 스토리를 만들고 채팅으로 이어나가는 AI 스토리챗 서비스`;

/**
 * 문서 제목(브라우저 탭) 형식. 고유 제목이 있는 화면(스토리 상세·채팅·공유 열람)은
 * 화면 제목 뒤에 서비스명을 붙여 `제목 - 마냑`으로 통일한다.
 */
export const TITLE_TEMPLATE = `%s - ${SITE_NAME}`;

/**
 * 화면 제목에 서비스명을 붙인다. 제목이 비면 접미사만 남지 않도록 기본 문서 제목을 반환한다.
 *
 * @param title 화면 제목
 * @returns `제목 - 마냑` 형식의 문서 제목
 */
export function formatDocumentTitle(title: string) {
  return title ? TITLE_TEMPLATE.replace('%s', title) : DEFAULT_TITLE;
}

/**
 * 검색엔진에 브랜드 엔티티를 알리는 JSON-LD(schema.org) 구조화 데이터.
 * `alternateName`은 로마자 표기를 함께 선언해 '마냑'이 오타가 아닌 브랜드명임을
 * 검색엔진이 학습하도록 돕는다.
 */
export const SITE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo/manyak-logo.svg`,
      // 공식 SNS 프로필. 같은 이름의 외부 채널을 연결해 브랜드 엔티티 신호를 보강한다.
      sameAs: ['https://www.instagram.com/manyak.story/'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ['manyak', 'Manyak'],
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: 'ko',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
} as const;

/**
 * JSON-LD를 `<script>`에 인라인해도 안전하도록 직렬화한다. `<`를 유니코드로
 * 이스케이프해 `</script>` 조기 종료(XSS)를 막는다.
 *
 * @returns `<script type="application/ld+json">`에 넣을 JSON 문자열
 */
export function serializeStructuredData() {
  return JSON.stringify(SITE_STRUCTURED_DATA).replace(/</g, '\\u003c');
}
