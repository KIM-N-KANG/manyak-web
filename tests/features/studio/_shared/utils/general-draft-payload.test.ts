import { describe, expect, it } from 'vitest';

import {
  readGeneralDraftPayload,
  toGeneralDraftRequest,
} from '@/features/studio/_shared/utils/general-draft-payload';
import type { GeneralStoryDraftSnapshot } from '@/features/studio/_shared/utils/general-story-draft';
import { EMPTY_GENERAL_TEXT_VALUES } from '@/features/studio/general/constants';
import { EMPTY_GENRE_SELECTION } from '@/features/studio/general/utils/genre-selection';
import { createStartSettingDraft } from '@/features/studio/general/utils/start-setting-draft';

const COVER_KEY = 'thumbnails/uploaded/drafts/u/a.jpg';
const CHARACTER_KEY = 'characters/uploaded/drafts/u/b.png';

const snapshot = (): GeneralStoryDraftSnapshot => ({
  texts: {
    ...EMPTY_GENERAL_TEXT_VALUES,
    title: '  노선도에 없는 역 ',
    world: '유실역은 막차가 끊긴 뒤에만 불이 켜진다',
  },
  cover: { objectKey: COVER_KEY, blob: new Blob(['cover']) },
  descriptionRatio: 7,
  protagonist: { name: '도윤', gender: 'MALE', feature: '역무원' },
  supporting: [
    {
      id: 's1',
      name: '서하',
      gender: 'FEMALE',
      description: '막차 승객',
      feature: '말이 없다',
      image: { objectKey: CHARACTER_KEY, blob: new Blob(['face']) },
    },
  ],
  startSettings: [createStartSettingDraft()],
  mainEvents: [],
  genres: EMPTY_GENRE_SELECTION,
  description: '주요 내용',
  visibility: 'PUBLIC',
});

describe('toGeneralDraftRequest', () => {
  it('고정 필드와 목록용 요약을 채운다', () => {
    const request = toGeneralDraftRequest(snapshot(), 2);

    expect(request).toMatchObject({
      mode: 'GENERAL',
      stage: 'GENERAL_DRAFT',
      schemaVersion: 1,
      baseVersion: 2,
      title: '노선도에 없는 역',
      oneLineIntro: null,
      thumbnailObjectKey: COVER_KEY,
    });
  });

  it('표지가 없으면 표지 키는 null이다', () => {
    expect(
      toGeneralDraftRequest({ ...snapshot(), cover: null }, null)
        .thumbnailObjectKey,
    ).toBeNull();
  });

  it('이미지는 객체 키만 보내고 원본 파일은 뺀다', () => {
    const payload = toGeneralDraftRequest(snapshot(), null).payload as {
      cover: unknown;
      supporting: { image: unknown }[];
    };

    expect(payload.cover).toEqual({ objectKey: COVER_KEY });
    expect(payload.supporting[0].image).toEqual({ objectKey: CHARACTER_KEY });
  });
});

describe('readGeneralDraftPayload', () => {
  it('보낸 payload를 그대로 다시 읽는다. 이미지 원본은 없다', () => {
    const original = snapshot();
    const payload = toGeneralDraftRequest(original, null).payload as Record<
      string,
      unknown
    >;

    expect(readGeneralDraftPayload(payload)).toEqual({
      ...original,
      cover: { objectKey: COVER_KEY, blob: null },
      supporting: [
        {
          ...original.supporting[0],
          image: { objectKey: CHARACTER_KEY, blob: null },
        },
      ],
    });
  });

  it('빠졌거나 타입이 틀린 최상위 필드는 새 폼의 기본값으로 채운다', () => {
    const read = readGeneralDraftPayload({
      texts: { title: '제목', world: 3 },
      visibility: 'SECRET',
      descriptionRatio: '9',
      cover: { objectKey: 4 },
    });

    expect(read.texts).toEqual({
      ...EMPTY_GENERAL_TEXT_VALUES,
      title: '제목',
    });
    expect(read.supporting).toHaveLength(1);
    expect(read.supporting[0]).toMatchObject({
      name: '',
      gender: null,
      description: '',
      feature: '',
      image: null,
    });
    expect(read.startSettings).toHaveLength(1);
    expect(read.mainEvents).toEqual([]);
    expect(read.genres).toEqual(EMPTY_GENRE_SELECTION);
    expect(read.descriptionRatio).toBe(5);
    expect(read.description).toBe('');
    expect(read.visibility).toBe('PRIVATE');
    expect(read.cover).toBeNull();
    expect(read.protagonist).toEqual({ name: '', gender: null, feature: '' });
  });

  it('항목 안에서 빠진 필드도 빈 값으로 채운다', () => {
    const read = readGeneralDraftPayload({
      texts: {},
      protagonist: { name: '도윤' },
      supporting: [{ name: '서하' }, { name: '하람' }],
      startSettings: [{ name: '막차' }],
      mainEvents: [{ name: '정전' }],
      genres: { selected: [] },
    });

    expect(read.protagonist).toEqual({
      name: '도윤',
      gender: null,
      feature: '',
    });
    expect(read.supporting[0]).toMatchObject({
      name: '서하',
      gender: null,
      description: '',
      feature: '',
      image: null,
    });
    // id가 없으면 인물마다 새로 만들어 하나를 지울 때 다른 인물이 함께 지워지지 않게 한다.
    expect(read.supporting[0].id).toEqual(expect.any(String));
    expect(read.supporting[0].id).not.toBe(read.supporting[1].id);
    expect(read.startSettings[0]).toMatchObject({
      name: '막차',
      prologue: '',
      situation: '',
      suggestedInputs: ['', '', ''],
      endings: [],
    });
    expect(read.mainEvents[0]).toMatchObject({
      name: '정전',
      description: '',
      keySentence: '',
    });
    expect(read.genres).toEqual({ selected: [], customTags: [] });
  });
});
