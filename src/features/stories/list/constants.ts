/**
 * 홈 목록의 섹션 제목. 오리지널(마냑 공식 계정 스토리)과 내가 만든 스토리를 구분하는 정본 문구다.
 * E2E·문서가 리터럴을 복제하지 않도록 여기서만 정의한다.
 */
export const STORY_SECTION_TITLE = {
  ORIGINAL: '오리지널 스토리',
  CREATED: '내가 만든 스토리',
} as const;

/**
 * 오리지널 카드 썸네일에 얹는 ORIGINAL 태그 이미지 경로.
 * 디자인 에셋에 같은 도안의 변형(색 3종 × 불투명·반투명)이 있어 파일명을 원본 그대로 두고,
 * 교체는 파일을 public/stories에 추가한 뒤 이 상수의 파일명만 바꾸면 되게 한다.
 */
export const ORIGINAL_TAG_SRC =
  '/stories/manyak-original-tag-black-green-translucent.svg';
