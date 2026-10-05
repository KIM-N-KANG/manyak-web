import { describe, expect, it } from 'vitest';

import {
  readCreateSubmissions,
  readStorySubmission,
} from '@/features/studio/_shared/utils/story-submission';

const SUBMISSION = {
  submissionId: 'submission-1',
  storyId: null,
  kind: 'CREATE',
  status: 'REJECTED',
  createdAt: '2026-09-29T12:00:00Z',
  errorCode: null,
  issues: [
    {
      path: 'startSettings[0].prologue',
      type: 'TEXT',
      rule: 'DRUGS',
      reason: '마약 사용을 권장합니다.',
    },
  ],
  imageErrors: [{ path: 'thumbnailUrl', errorCode: 'IMAGE_INVALID' }],
  payload: {
    title: '유실역',
    genres: ['호러', 3],
    thumbnailObjectKey: 'thumbnails/uploaded/drafts/me/a.png',
    thumbnailUrl: 'https://dev-cdn.manyak.app/a.png',
    startSettings: [
      {
        name: '막차',
        suggestedInputs: ['a', 'b', 'c'],
        endings: [
          {
            name: '탈출',
            requirement: { minTurns: 3, achievementCondition: '출구' },
            epilogue: '끝',
          },
        ],
      },
    ],
    characters: [
      {
        id: null,
        name: '도하람',
        description: '보관소 관리인',
        images: [
          {
            id: null,
            objectKey: 'characters/k.png',
            imageUrl: 'https://cdn/k.png',
            imageName: '도하람_기본',
          },
        ],
      },
    ],
  },
};

describe('readStorySubmission', () => {
  it('상태·검수 결과·입력을 읽고 빠진 값은 빈 값으로 채운다', () => {
    const submission = readStorySubmission(SUBMISSION);

    expect(submission).toMatchObject({
      submissionId: 'submission-1',
      kind: 'CREATE',
      status: 'REJECTED',
      issues: [
        {
          path: 'startSettings[0].prologue',
          reason: '마약 사용을 권장합니다.',
        },
      ],
      imageErrors: [{ path: 'thumbnailUrl', errorCode: 'IMAGE_INVALID' }],
    });
    expect(submission?.payload).toMatchObject({
      title: '유실역',
      oneLineIntro: '',
      genres: ['호러'],
      visibility: 'PRIVATE',
      cover: {
        objectKey: 'thumbnails/uploaded/drafts/me/a.png',
        imageUrl: 'https://dev-cdn.manyak.app/a.png',
      },
      startSettings: [
        { endings: [{ minTurns: 3, achievementCondition: '출구' }] },
      ],
      characters: [
        {
          name: '도하람',
          description: '보관소 관리인',
          images: [
            { objectKey: 'characters/k.png', imageUrl: 'https://cdn/k.png' },
          ],
        },
      ],
    });
  });

  it('id나 상태를 읽지 못하면 null을 반환한다', () => {
    expect(readStorySubmission({ status: 'PENDING' })).toBeNull();
    expect(
      readStorySubmission({ submissionId: 's', status: 'DONE' }),
    ).toBeNull();
  });
});

describe('readCreateSubmissions', () => {
  it('승인되지 않은 신규 등록 제출본만 고른다', () => {
    const list = readCreateSubmissions([
      SUBMISSION,
      { ...SUBMISSION, submissionId: 'update', kind: 'UPDATE' },
      { ...SUBMISSION, submissionId: 'approved', status: 'APPROVED' },
      'broken',
    ]);

    expect(list.map(({ submissionId }) => submissionId)).toEqual([
      'submission-1',
    ]);
  });
});
