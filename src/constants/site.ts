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

/** 홈 검색 결과와 공유 미리보기에 사용하는 서비스 설명이다. */
export const HOME_DESCRIPTION =
  '키워드를 골라 스토리를 만들면 주변 인물 이미지까지 한 번에 완성되는 AI 스토리챗, 마냑. 채팅으로 스토리를 이어가 보세요. 실시간 이미지를 켜면 대화에 따라 인물의 표정과 행동, 스토리 속 장소가 달라져요. 생생한 장면을 보며 스토리에 푹 빠져보세요.';

/**
 * 운영 팀명. 저작권 표기가 사용한다.
 */
export const SITE_TEAM_NAME = '김앤강';

/**
 * 공식 문의 이메일. 사업자 정보 푸터와 이프 충전 안내가 사용한다.
 * Cloudflare Email Routing이 운영 Gmail로 전달하며, 약관과 처리방침 본문의 문의처와 같은 값이어야 한다.
 */
export const SITE_CONTACT_EMAIL = 'contact@manyak.app';

/** 사업자등록번호. 사업자 정보 표시와 공정거래위원회 사업자정보 공개 페이지 주소가 함께 쓴다. */
const SITE_BUSINESS_REGISTRATION_NUMBER = '202-04-55303';

/**
 * 전자상거래법 제10조와 제13조가 표시를 요구하는 사업자 정보. 홈과 마이 화면 하단 푸터가 표시 순서대로 사용한다.
 * 통신판매업 신고번호는 발급 전이라 접수 상태로 두고, 번호가 나오면 값만 바꾼다.
 * 호스팅서비스 제공자는 웹 호스팅과 서버 운영을 맡은 사업자이고, 호스팅을 옮기면 값만 바꾼다.
 */
export const SITE_BUSINESS_INFO = [
  { label: '상호', value: '나그네랩' },
  { label: '대표', value: '강경현' },
  { label: '사업자등록번호', value: SITE_BUSINESS_REGISTRATION_NUMBER },
  { label: '통신판매업 신고번호', value: '신고 접수' },
  {
    label: '주소',
    value: '경기도 용인시 기흥구 서천동로21번길 6-5, 3층 303호',
  },
  { label: '전화', value: '010-8126-6089' },
  { label: '이메일', value: SITE_CONTACT_EMAIL },
  { label: '호스팅서비스 제공자', value: 'Vercel Inc., Oracle Corporation' },
] as const;

/**
 * 공정거래위원회 사업자정보 공개 페이지 주소. 전자상거래법 시행규칙이 초기 화면에 연결하도록 한 페이지로,
 * 사업자등록번호의 숫자만 넘긴다.
 */
export const SITE_FTC_BUSINESS_INFO_URL = `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${SITE_BUSINESS_REGISTRATION_NUMBER.replaceAll('-', '')}`;

/**
 * 공식 인스타그램 프로필. 랜딩 푸터와 구조화 데이터(`sameAs`)가 공유한다.
 */
export const SITE_INSTAGRAM_URL = 'https://www.instagram.com/manyak.story/';

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
      sameAs: [SITE_INSTAGRAM_URL],
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
