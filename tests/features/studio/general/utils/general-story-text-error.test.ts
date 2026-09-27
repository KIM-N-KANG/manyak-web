import { describe, expect, it } from 'vitest';

import { GENERAL_STORY_TEXT_FIELDS } from '@/features/studio/general/constants';
import { getGeneralStoryTextError } from '@/features/studio/general/utils/general-story-text-error';

const TITLE_ERROR = GENERAL_STORY_TEXT_FIELDS.title.minLengthError;

describe('getGeneralStoryTextError', () => {
  it('제목이 한 글자면 최소 글자 수 오류를 반환한다', () => {
    expect(getGeneralStoryTextError('title', '역')).toBe(TITLE_ERROR);
  });

  it('앞뒤 공백은 글자 수에 넣지 않는다', () => {
    expect(getGeneralStoryTextError('title', '  역  ')).toBe(TITLE_ERROR);
    expect(getGeneralStoryTextError('title', ' 역사 ')).toBeNull();
  });

  it('비어 있으면 필수 검사에 맡기고 오류로 보지 않는다', () => {
    expect(getGeneralStoryTextError('title', '')).toBeNull();
    expect(getGeneralStoryTextError('title', '   ')).toBeNull();
  });

  it('이모지는 한 글자로 센다', () => {
    expect(getGeneralStoryTextError('title', '🚉')).toBe(TITLE_ERROR);
  });

  it('최소 글자 수가 없는 항목은 오류가 없다', () => {
    expect(getGeneralStoryTextError('oneLineIntro', '역')).toBeNull();
  });
});
