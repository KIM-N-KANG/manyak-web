import { describe, expect, it } from 'vitest';

import {
  buildGeneralStoryRequest,
  type GeneralStoryRequestInput,
  resolveGenreNames,
} from '@/features/studio/general/utils/build-general-story-request';

const TAGS = [
  { id: 1, name: '미스터리', category: 'GENRE' as const },
  { id: 2, name: '호러', category: 'GENRE' as const },
];

const INPUT: GeneralStoryRequestInput = {
  texts: {
    title: ' 유실역 ',
    oneLineIntro: '막차가 멈춘 역',
    world: '폐역이 된 지하철역',
    progression: '긴장감 있게',
  },
  coverObjectKey: 'thumbnails/uploaded/drafts/me/cover.png',
  descriptionRatio: 6,
  protagonist: { name: '윤해솔', gender: 'FEMALE', feature: '회사원' },
  supporting: [
    {
      name: ' 도하람 ',
      gender: 'MALE',
      feature: '',
      imageObjectKey: 'characters/uploaded/drafts/me/a.png',
    },
    { name: '서은결', gender: 'FEMALE', feature: '', imageObjectKey: null },
  ],
  startSettings: [
    {
      id: 'client-start',
      name: '막차',
      prologue: '프롤로그',
      situation: '역에 갇혔다',
      suggestedInputs: [' 주위를 본다 ', '소리친다', '기다린다'],
      endings: [
        {
          id: 'client-ending',
          name: '탈출',
          minTurns: '12',
          condition: '출구를 찾는다',
          epilogue: '에필로그',
        },
      ],
    },
  ],
  mainEvents: [
    {
      id: 'client-event',
      name: '정전',
      description: '불이 꺼진다',
      keySentence: '주인공이 손전등을 켠다',
    },
  ],
  genres: {
    selected: [
      { kind: 'custom', id: 'c1' },
      { kind: 'tag', id: 2 },
    ],
    customTags: [{ id: 'c1', name: '지하철' }],
  },
  description: '  ',
  visibility: 'PUBLIC',
};

describe('resolveGenreNames', () => {
  it('고른 순서대로 제공 장르와 직접 추가한 장르의 이름을 반환한다', () => {
    expect(resolveGenreNames(INPUT.genres, TAGS)).toEqual(['지하철', '호러']);
  });

  it('제공 장르의 이름을 찾지 못하면 null을 반환한다', () => {
    expect(resolveGenreNames(INPUT.genres, [])).toBeNull();
  });
});

describe('buildGeneralStoryRequest', () => {
  it('폼 입력을 등록 요청 본문으로 바꾼다', () => {
    const request = buildGeneralStoryRequest(INPUT, ['지하철', '호러']);

    expect(request).toMatchObject({
      title: '유실역',
      genres: ['지하철', '호러'],
      visibility: 'PUBLIC',
      thumbnailObjectKey: INPUT.coverObjectKey,
      startSettings: [
        {
          name: '막차',
          startSituation: '역에 갇혔다',
          suggestedInputs: ['주위를 본다', '소리친다', '기다린다'],
          endings: [
            {
              name: '탈출',
              requirement: {
                minTurns: 12,
                achievementCondition: '출구를 찾는다',
              },
              epilogue: '에필로그',
            },
          ],
        },
      ],
      mainEvents: [
        {
          name: '정전',
          description: '불이 꺼진다',
          keySentence: '주인공이 손전등을 켠다',
        },
      ],
      characters: [
        {
          name: '도하람',
          images: [
            {
              objectKey: 'characters/uploaded/drafts/me/a.png',
              imageName: '도하람_기본',
            },
          ],
        },
        { name: '서은결', images: [] },
      ],
    });
    expect(request.storySettings.ruleSetting).toContain('묘사 6 : 대사 4');
    expect(request.storySettings.characterSetting).toContain('## 도하람');
    expect(request).not.toHaveProperty('description');
    expect(JSON.stringify(request)).not.toContain('client-');
  });
});
