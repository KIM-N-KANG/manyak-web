/**
 * 서비스 대표 오리진. 메타데이터(metadataBase·OG)와 robots·sitemap이 공유한다.
 */
export const SITE_URL = 'https://manyak.app';

/**
 * 서비스 이름. 메타데이터와 문서 제목 접미사가 공유한다.
 */
export const SITE_NAME = '마냑';

/**
 * 문서 제목(브라우저 탭) 형식. 화면 제목 뒤에 서비스명을 붙여 `제목 • 마냑`으로 통일한다.
 */
export const TITLE_TEMPLATE = `%s • ${SITE_NAME}`;

/**
 * 화면 제목에 서비스명을 붙인다. 제목이 비면 접미사만 남지 않도록 서비스명만 반환한다.
 *
 * @param title 화면 제목
 * @returns `제목 • 마냑` 형식의 문서 제목
 */
export function formatDocumentTitle(title: string) {
  return title ? TITLE_TEMPLATE.replace('%s', title) : SITE_NAME;
}
