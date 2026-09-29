import { describe, expect, it } from 'vitest';

import { GENERAL_STORY_REVIEW_COPY } from '@/features/studio/general/constants';
import {
  type GeneralStoryReviewForm,
  getReviewErrors,
} from '@/features/studio/general/utils/review-issues';

const SUBMITTED: GeneralStoryReviewForm = {
  texts: {
    title: '유실역',
    oneLineIntro: '막차',
    world: '폐역',
    progression: '긴장감',
  },
  cover: { objectKey: 'cover-key' },
  protagonist: { name: '윤해솔', gender: 'FEMALE', feature: '회사원' },
  supporting: [
    {
      id: 'c1',
      name: '도하람',
      gender: 'MALE',
      feature: '',
      image: { objectKey: 'k1' },
    },
  ],
  startSettings: [
    {
      id: 's1',
      name: '막차',
      prologue: '마약을 권한다',
      situation: 's',
      suggestedInputs: ['a', 'b', 'c'],
      endings: [
        {
          id: 'e1',
          name: '탈출',
          minTurns: '3',
          condition: 'c',
          epilogue: 'e',
        },
      ],
    },
  ],
  mainEvents: [{ id: 'm1', name: '정전', description: 'd', keySentence: 'k' }],
  genres: { selected: [], customTags: [] },
  description: '',
};

const REVIEW = {
  issues: [
    { path: 'startSettings[0].prologue', reason: '마약 사용을 권장합니다.' },
    {
      path: 'startSettings[0].endings[0].requirement.achievementCondition',
      reason: '',
    },
    {
      path: 'storySettings.characterSetting',
      reason: '인물 설정이 혐오를 부추깁니다.',
    },
    { path: 'unknown.field', reason: '알 수 없는 위치' },
  ],
  imageErrors: [
    { path: 'characters[0].images[0].imageUrl', errorCode: 'IMAGE_UNREADABLE' },
  ],
};

describe('getReviewErrors', () => {
  it('검수 결과를 칸별 오류와 폼 위 안내로 나눈다', () => {
    const { fieldErrors, notices } = getReviewErrors(
      REVIEW,
      SUBMITTED,
      SUBMITTED,
    );

    expect(fieldErrors).toEqual([
      {
        key: 'review.supporting',
        tab: 'supporting',
        message: '인물 설정이 혐오를 부추깁니다.',
      },
      {
        key: 'supporting.c1.image',
        tab: 'supporting',
        collapsibleId: 'general-story-supporting-c1',
        message: GENERAL_STORY_REVIEW_COPY.imageError.IMAGE_UNREADABLE,
      },
      {
        key: 'start.s1.prologue',
        tab: 'start',
        startSettingId: 's1',
        message: '마약 사용을 권장합니다.',
      },
      {
        key: 'ending.e1.condition',
        tab: 'start',
        startSettingId: 's1',
        collapsibleId: 'general-story-ending-e1',
        message: GENERAL_STORY_REVIEW_COPY.issueFallback,
      },
    ]);
    expect(notices).toEqual([
      { tab: 'supporting', message: '인물 설정이 혐오를 부추깁니다.' },
      { tab: null, message: '알 수 없는 위치' },
    ]);
  });

  it('제출한 뒤 고친 칸과 지운 항목의 결과는 내린다', () => {
    const current: GeneralStoryReviewForm = {
      ...SUBMITTED,
      supporting: [{ ...SUBMITTED.supporting[0], image: { objectKey: 'k2' } }],
      startSettings: [
        {
          ...SUBMITTED.startSettings[0],
          prologue: '고친 프롤로그',
          endings: [],
        },
      ],
    };
    const { fieldErrors } = getReviewErrors(REVIEW, current, SUBMITTED);

    expect(fieldErrors.map(({ key }) => key)).toEqual(['review.supporting']);
  });
});
