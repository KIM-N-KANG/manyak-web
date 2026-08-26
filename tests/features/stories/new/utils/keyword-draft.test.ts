import { describe, expect, it } from 'vitest';

import type {
  KeywordCharacterSnapshot,
  KeywordDraftSnapshot,
} from '@/features/stories/_shared/utils/creation-request-storage';
import { hasKeywordDraftInput } from '@/features/stories/new/utils/keyword-draft';

const emptyCharacter: KeywordCharacterSnapshot = {
  name: '',
  gender: null,
  selectedTagIds: [],
  customTags: [],
};

const emptySnapshot: KeywordDraftSnapshot = {
  selectedGenreTagIds: [],
  customGenreTags: [],
  protagonist: emptyCharacter,
  supportingCharacters: [emptyCharacter],
};

describe('hasKeywordDraftInput', () => {
  it('초기 빈 주변 인물 한 명만 있으면 저장할 입력이 아니다', () => {
    expect(hasKeywordDraftInput(emptySnapshot)).toBe(false);
  });

  it.each([
    {
      name: '제공 장르',
      snapshot: { ...emptySnapshot, selectedGenreTagIds: [1] },
    },
    {
      name: '선택 해제한 직접 추가 장르',
      snapshot: {
        ...emptySnapshot,
        customGenreTags: [{ name: '느와르', selected: false }],
      },
    },
    {
      name: '주인공 성별',
      snapshot: {
        ...emptySnapshot,
        protagonist: { ...emptyCharacter, gender: 'FEMALE' as const },
      },
    },
    {
      name: '주변 인물 이름',
      snapshot: {
        ...emptySnapshot,
        supportingCharacters: [{ ...emptyCharacter, name: '마냑' }],
      },
    },
  ])('$name 입력은 저장 대상이다', ({ snapshot }) => {
    expect(hasKeywordDraftInput(snapshot)).toBe(true);
  });
});
