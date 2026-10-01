/** 등록 전 이미지 업로드가 받는 형식이다(서버 presign 규칙). */
export const DRAFT_IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** 등록 전 이미지 한 장의 최대 크기(5MB)다. */
export const DRAFT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const DRAFT_IMAGE_FILE_ERROR = {
  type: 'JPG, PNG, WEBP 이미지만 올릴 수 있어요',
  size: '5MB 이하 이미지만 올릴 수 있어요',
} as const;

/**
 * 올리기 전에 서버가 거절할 파일을 걸러 오류 문구를 반환한다. 통과하면 null이다.
 *
 * @param file 형식과 바이트 크기를 가진 파일
 */
export function getDraftImageFileError(
  file: Pick<File, 'type' | 'size'>,
): string | null {
  if (
    !DRAFT_IMAGE_CONTENT_TYPES.includes(
      file.type as (typeof DRAFT_IMAGE_CONTENT_TYPES)[number],
    )
  ) {
    return DRAFT_IMAGE_FILE_ERROR.type;
  }

  if (file.size < 1 || file.size > DRAFT_IMAGE_MAX_BYTES) {
    return DRAFT_IMAGE_FILE_ERROR.size;
  }

  return null;
}
