/** 링크 미리보기 설명의 최대 길이. 대부분의 메신저가 이 부근에서 잘라 보여준다. */
export const SHARE_DESCRIPTION_MAX_LENGTH = 100;

/**
 * 프롤로그를 링크 미리보기 설명 길이에 맞게 정리한다.
 *
 * @param text 원본 프롤로그
 * @returns 공백이 정리되고 최대 길이로 잘린 설명
 */
export function truncateForDescription(text: string | undefined): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();

  if (normalized.length <= SHARE_DESCRIPTION_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, SHARE_DESCRIPTION_MAX_LENGTH)}…`;
}
