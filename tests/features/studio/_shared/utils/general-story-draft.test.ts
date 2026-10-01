import { describe, expect, it } from 'vitest';

import {
  type GeneralStoryDraftSnapshot,
  hasGeneralStoryDraftInput,
} from '@/features/studio/_shared/utils/general-story-draft';
import { GENERAL_STORY_TEXT_FIELDS } from '@/features/studio/general/constants';
import { createMainEventDraft } from '@/features/studio/general/utils/main-event-draft';
import {
  createEndingDraft,
  createStartSettingDraft,
} from '@/features/studio/general/utils/start-setting-draft';

const IMAGE = {
  objectKey: 'thumbnails/uploaded/drafts/u/a.png',
  blob: new Blob(),
};

const empty = (): GeneralStoryDraftSnapshot => ({
  texts: Object.fromEntries(
    Object.keys(GENERAL_STORY_TEXT_FIELDS).map((field) => [field, '']),
  ) as GeneralStoryDraftSnapshot['texts'],
  cover: null,
  descriptionRatio: 5,
  protagonist: { name: '', gender: null, feature: '' },
  supporting: [{ id: 's1', name: '', gender: null, feature: '', image: null }],
  startSettings: [createStartSettingDraft()],
  mainEvents: [],
  genres: { selected: [], customTags: [] },
  description: '',
  visibility: 'PRIVATE',
});

describe('hasGeneralStoryDraftInput', () => {
  it('처음 폼과 기본값이 있는 설정만 바꾼 폼은 입력이 없는 것이다', () => {
    expect(hasGeneralStoryDraftInput(empty())).toBe(false);
    expect(
      hasGeneralStoryDraftInput({
        ...empty(),
        descriptionRatio: 8,
        visibility: 'PUBLIC',
        mainEvents: [createMainEventDraft()],
        texts: { ...empty().texts, title: '  ' },
      }),
    ).toBe(false);
  });

  it('글·이미지·성별·인물 소개·엔딩·장르 중 하나라도 있으면 입력이 있는 것이다', () => {
    const cases: Partial<GeneralStoryDraftSnapshot>[] = [
      { texts: { ...empty().texts, oneLineIntro: '소개' } },
      { cover: IMAGE },
      { protagonist: { name: '', gender: 'MALE', feature: '' } },
      {
        supporting: [
          { id: 's1', name: '', gender: null, feature: '', image: IMAGE },
        ],
      },
      {
        supporting: [
          {
            id: 's1',
            name: '',
            gender: null,
            description: '관리인',
            feature: '',
            image: null,
          },
        ],
      },
      {
        startSettings: [
          { ...createStartSettingDraft(), endings: [createEndingDraft()] },
        ],
      },
      { mainEvents: [{ ...createMainEventDraft(), keySentence: '문을 연다' }] },
      { genres: { selected: [{ kind: 'tag', id: 1 }], customTags: [] } },
      { description: '줄거리' },
    ];

    for (const patch of cases) {
      expect(hasGeneralStoryDraftInput({ ...empty(), ...patch })).toBe(true);
    }
  });
});
