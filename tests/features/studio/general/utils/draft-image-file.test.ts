import { describe, expect, it } from 'vitest';

import {
  DRAFT_IMAGE_FILE_ERROR,
  DRAFT_IMAGE_MAX_BYTES,
  getDraftImageFileError,
} from '@/features/studio/general/utils/draft-image-file';

describe('getDraftImageFileError', () => {
  it('JPG·PNG·WEBP는 5MB까지 통과한다', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(
        getDraftImageFileError({ type, size: DRAFT_IMAGE_MAX_BYTES }),
      ).toBeNull();
    }
  });

  it('다른 형식은 형식 오류를 반환한다', () => {
    expect(getDraftImageFileError({ type: 'image/heic', size: 10 })).toBe(
      DRAFT_IMAGE_FILE_ERROR.type,
    );
    expect(getDraftImageFileError({ type: 'image/gif', size: 10 })).toBe(
      DRAFT_IMAGE_FILE_ERROR.type,
    );
  });

  it('5MB를 넘거나 빈 파일은 크기 오류를 반환한다', () => {
    expect(
      getDraftImageFileError({
        type: 'image/png',
        size: DRAFT_IMAGE_MAX_BYTES + 1,
      }),
    ).toBe(DRAFT_IMAGE_FILE_ERROR.size);
    expect(getDraftImageFileError({ type: 'image/png', size: 0 })).toBe(
      DRAFT_IMAGE_FILE_ERROR.size,
    );
  });
});
