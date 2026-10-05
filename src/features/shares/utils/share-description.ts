/** 링크 미리보기 설명의 최대 길이. 대부분의 메신저가 이 부근에서 잘라 보여준다. */
export const SHARE_DESCRIPTION_MAX_LENGTH = 100;

/** 본문 안의 이미지 마커 한 줄(`[[URL]]`). 미리보기 설명에는 URL 원문을 남기지 않는다. */
const IMAGE_MARKER_LINE = /^\[\[https:\/\/[^\r\n]+\]\]$/gm;

/**
 * 프롤로그를 링크 미리보기 설명 길이에 맞게 정리한다.
 *
 * @param text 원본 프롤로그
 * @returns 이미지 마커를 지우고 공백을 정리해 최대 길이로 자른 설명
 */
export function truncateForDescription(text: string | undefined): string {
  const normalized = (text ?? '')
    .replace(IMAGE_MARKER_LINE, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= SHARE_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, SHARE_DESCRIPTION_MAX_LENGTH)}…`;
}
