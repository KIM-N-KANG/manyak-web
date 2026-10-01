import { describe, expect, it } from 'vitest';

import { readStorySubmission } from '@/features/studio/_shared/utils/story-submission';
import { submissionToFormInitial } from '@/features/studio/general/utils/submission-form';

const payload = readStorySubmission({
  submissionId: 's',
  status: 'REJECTED',
  payload: {
    title: '유실역',
    oneLineIntro: '막차',
    description: '줄거리',
    genres: ['호러', '지하철'],
    visibility: 'PUBLIC',
    storySettings: {
      worldSetting: '# 세계관\n폐역',
      ruleSetting: '# 전개 규칙\n긴장감\n\n# 분량 배분\n묘사 7 : 대사 3',
      userRoleSetting: '# 주인공\n## 호칭\n윤해솔\n## 성별\n여성\n회사원',
      characterSetting:
        '# 등장인물\n\n## 도하람\n### 성별\n남성\n관리인\n\n## 서은결\n### 성별\n여성',
    },
    startSettings: [
      {
        name: '막차',
        prologue: 'p',
        startSituation: 's',
        suggestedInputs: ['a', 'b'],
        endings: [
          {
            name: '탈출',
            requirement: { minTurns: 12, achievementCondition: 'c' },
            epilogue: 'e',
          },
        ],
      },
    ],
    mainEvents: [{ name: '정전', description: 'd', keySentence: 'k' }],
    thumbnailObjectKey: 'cover-key',
    thumbnailUrl: 'https://cdn/cover.png',
    characters: [
      {
        name: '서은결',
        images: [{ objectKey: 'eun-key', imageUrl: 'https://cdn/eun.png' }],
      },
      { name: '도하람', images: [] },
    ],
  },
})!.payload;

describe('submissionToFormInitial', () => {
  it('설정 글을 칸으로 나누고 이미지는 같은 이름의 인물에 붙인다', () => {
    const form = submissionToFormInitial(payload, [
      { id: 7, name: '호러', category: 'GENRE' },
    ]);

    expect(form.texts).toEqual({
      title: '유실역',
      oneLineIntro: '막차',
      world: '폐역',
      progression: '긴장감',
    });
    expect(form.descriptionRatio).toBe(7);
    expect(form.protagonist).toEqual({
      name: '윤해솔',
      gender: 'FEMALE',
      feature: '회사원',
    });
    expect(
      form.supporting.map(({ name, gender, image }) => ({
        name,
        gender,
        image,
      })),
    ).toEqual([
      { name: '도하람', gender: 'MALE', image: null },
      {
        name: '서은결',
        gender: 'FEMALE',
        image: {
          objectKey: 'eun-key',
          previewUrl: 'https://cdn/eun.png',
          blob: null,
        },
      },
    ]);
    expect(form.cover).toEqual({
      objectKey: 'cover-key',
      previewUrl: 'https://cdn/cover.png',
      blob: null,
    });
    expect(form.startSettings[0]).toMatchObject({
      situation: 's',
      suggestedInputs: ['a', 'b', ''],
      endings: [{ minTurns: '12', condition: 'c' }],
    });
    expect(form.genres.selected[0]).toEqual({ kind: 'tag', id: 7 });
    expect(form.genres.selected[1]).toMatchObject({ kind: 'custom' });
    expect(form.genres.customTags.map(({ name }) => name)).toEqual(['지하철']);
    expect(form.visibility).toBe('PUBLIC');
  });
});
