import { describe, expect, it } from 'vitest';

import { getMinLengthError } from '@/features/studio/general/utils/general-story-text-error';

describe('getMinLengthError', () => {
  it('한 글자면 칸 이름을 넣은 최소 글자 수 오류를 반환한다', () => {
    expect(getMinLengthError('제목', '역')).toBe(
      '제목은 2자 이상 입력해 주세요',
    );
  });

  it('칸 이름의 받침에 맞춰 은·는을 고른다', () => {
    expect(getMinLengthError('프롤로그', '역')).toBe(
      '프롤로그는 2자 이상 입력해 주세요',
    );
    expect(getMinLengthError('한 줄 소개', '역')).toBe(
      '한 줄 소개는 2자 이상 입력해 주세요',
    );
    expect(getMinLengthError('키 문장', '역')).toBe(
      '키 문장은 2자 이상 입력해 주세요',
    );
  });

  it('앞뒤 공백은 글자 수에 넣지 않는다', () => {
    expect(getMinLengthError('제목', '  역  ')).not.toBeNull();
    expect(getMinLengthError('제목', ' 역사 ')).toBeNull();
  });

  it('비어 있으면 필수 검사에 맡기고 오류로 보지 않는다', () => {
    expect(getMinLengthError('제목', '')).toBeNull();
    expect(getMinLengthError('제목', '   ')).toBeNull();
  });

  it('이모지는 한 글자로 센다', () => {
    expect(getMinLengthError('제목', '🚉')).not.toBeNull();
  });
});
