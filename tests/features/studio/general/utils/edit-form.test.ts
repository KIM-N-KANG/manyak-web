import { describe, expect, it } from 'vitest';

import type { StoryEditFormResponse } from '@/api/generated/models';
import {
  buildStoryEditCandidate,
  buildStoryEditRequest,
  readStoryEdit,
} from '@/features/studio/general/utils/edit-form';
import { createStartSettingDraft } from '@/features/studio/general/utils/start-setting-draft';
import type { GeneralStoryFormInitial } from '@/features/studio/general/utils/submission-form';

const CATALOG = { genres: [{ id: 7, name: '호러' }], featuredGenres: [] };

const EDIT_FORM: StoryEditFormResponse = {
  title: '유실역',
  oneLineIntro: '막차',
  description: '줄거리',
  genres: ['호러'],
  visibility: 'PRIVATE',
  storySettings: {
    worldSetting: '# 세계관\n폐역',
    ruleSetting: '# 전개 규칙\n긴장감\n\n# 분량 배분\n묘사 7 : 대사 3',
    userRoleSetting: '# 주인공\n## 호칭\n윤해솔\n## 성별\n여성\n회사원',
    characterSetting: '# 등장인물\n\n## 도하람\n### 성별\n남성\n관리인',
  },
  startSettings: [
    {
      id: 'start-1',
      name: '막차',
      prologue: 'p',
      startSituation: 's',
      suggestedInputs: ['a', 'b', 'c'],
      endings: [],
    },
  ],
  mainEvents: [],
  thumbnailUrl: 'https://cdn/cover.png',
  thumbnailModerationStatus: 'APPROVED',
  characters: [
    {
      id: 'char-ha',
      name: '도하람',
      description: '보관소 관리인',
      images: [
        {
          id: 'img-1',
          imageName: '도하람_기본',
          imageUrl: 'https://cdn/ha.png',
          moderationStatus: 'APPROVED',
        },
        {
          id: 'img-2',
          imageName: '도하람_웃음',
          imageUrl: 'https://cdn/ha2.png',
          moderationStatus: 'APPROVED',
        },
      ],
    },
    // 간편 제작 스토리처럼 설정 글에 없는 인물 행이다. 폼에는 보이지 않지만 지워지면 안 된다.
    { id: 'char-me', name: '윤해솔', description: '막차 승객', images: [] },
  ],
  submission: null,
};

/**
 * 폼을 바꾼 뒤 보낼 PATCH 본문을 만든다.
 *
 * @param change 폼을 바꾸는 함수
 * @param data 수정 폼 응답
 * @param sendAll 모든 필드를 보낼지. 없으면 응답의 제출본 상태를 따른다
 * @returns PATCH 본문
 */
function requestAfter(
  change: (form: GeneralStoryFormInitial) => GeneralStoryFormInitial,
  data: StoryEditFormResponse = EDIT_FORM,
  sendAll?: boolean,
) {
  const edit = readStoryEdit(data, CATALOG);

  return buildStoryEditRequest(
    buildStoryEditCandidate(change(edit.initial), ['호러'], edit.base),
    edit.base.baseline,
    sendAll ?? edit.base.sendAll,
  );
}

describe('readStoryEdit', () => {
  it('시작 설정과 짝지은 주변 인물의 폼 id를 서버 id로 두고 현재 이미지를 미리보기로 보인다', () => {
    const { initial, base, submission } = readStoryEdit(EDIT_FORM, CATALOG);

    expect(initial.startSettings.map(({ id }) => id)).toEqual(['start-1']);
    expect(initial.supporting).toHaveLength(1);
    expect(initial.supporting[0]).toMatchObject({
      id: 'char-ha',
      name: '도하람',
      description: '보관소 관리인',
      image: { objectKey: '', previewUrl: 'https://cdn/ha.png', blob: null },
    });
    expect(initial.cover).toEqual({
      objectKey: '',
      previewUrl: 'https://cdn/cover.png',
      blob: null,
    });
    expect(base.characters.map(({ id, formId }) => ({ id, formId }))).toEqual([
      { id: 'char-ha', formId: 'char-ha' },
      { id: 'char-me', formId: null },
    ]);
    expect(base.sendAll).toBe(false);
    expect(submission).toBeNull();
  });

  it('반려된 제출본은 폼 위 안내에 쓰고 모든 필드를 보내게 한다', () => {
    const { submission, base } = readStoryEdit(
      {
        ...EDIT_FORM,
        submission: {
          submissionId: 'sub-1',
          status: 'REJECTED',
          issues: [{ path: 'title', reason: '부적절한 제목' }],
          imageErrors: [],
          errorCode: null,
        },
      },
      CATALOG,
    );

    expect(submission).toMatchObject({
      submissionId: 'sub-1',
      kind: 'UPDATE',
      status: 'REJECTED',
      issues: [{ path: 'title', reason: '부적절한 제목' }],
    });
    expect(base.sendAll).toBe(true);
  });

  it('이름이 같은 서버 인물이 없는 주변 인물은 인물 소개를 비운다', () => {
    const { initial } = readStoryEdit(
      {
        ...EDIT_FORM,
        storySettings: {
          ...EDIT_FORM.storySettings,
          characterSetting: '# 등장인물\n\n## 도하늘\n관리인',
        },
      },
      CATALOG,
    );

    expect(initial.supporting[0]).toMatchObject({
      name: '도하늘',
      description: '',
      image: null,
    });
  });

  it('승인된 제출본은 없는 것으로 본다', () => {
    const { submission, base } = readStoryEdit(
      {
        ...EDIT_FORM,
        submission: { submissionId: 'sub-1', status: 'APPROVED' },
      },
      CATALOG,
    );

    expect(submission).toBeNull();
    expect(base.sendAll).toBe(false);
  });
});

describe('buildStoryEditRequest', () => {
  it('바뀐 것이 없으면 빈 본문이다', () => {
    expect(requestAfter((form) => form)).toEqual({});
  });

  it('제목만 바꾸면 제목만 보낸다', () => {
    expect(
      requestAfter((form) => ({
        ...form,
        texts: { ...form.texts, title: '새 제목' },
      })),
    ).toEqual({ title: '새 제목' });
  });

  it('주요 내용을 지우면 빈 문자열을 보낸다', () => {
    expect(requestAfter((form) => ({ ...form, description: '' }))).toEqual({
      description: '',
    });
  });

  it('주변 인물 특징만 바꾸면 설정 글만 보내고 인물 목록은 보내지 않는다', () => {
    const request = requestAfter((form) => ({
      ...form,
      supporting: form.supporting.map((character) => ({
        ...character,
        feature: '야간 관리인',
      })),
    }));

    expect(Object.keys(request)).toEqual(['storySettings']);
  });

  it('인물 이름을 바꾸면 기존 id와 이미지 id를 싣고 폼에 없는 서버 인물을 보존한다', () => {
    const request = requestAfter((form) => ({
      ...form,
      supporting: form.supporting.map((character) => ({
        ...character,
        name: '도하늘',
      })),
    }));

    expect(request.characters).toEqual([
      {
        id: 'char-ha',
        name: '도하늘',
        description: '보관소 관리인',
        images: [{ id: 'img-1' }, { id: 'img-2' }],
      },
      { id: 'char-me', name: '윤해솔', images: [] },
    ]);
  });

  it('인물 소개를 지우면 빈 문자열로 인물 목록만 보낸다', () => {
    const request = requestAfter((form) => ({
      ...form,
      supporting: form.supporting.map((character) => ({
        ...character,
        description: '  ',
      })),
    }));

    expect(Object.keys(request)).toEqual(['characters']);
    expect(request.characters?.[0]).toMatchObject({
      id: 'char-ha',
      description: '',
    });
    expect(request.characters?.[1]).not.toHaveProperty('description');
  });

  it('대표 이미지를 바꾸면 새 이미지를 맨 앞에 두고 나머지 이미지는 id로 남긴다', () => {
    const request = requestAfter((form) => ({
      ...form,
      supporting: form.supporting.map((character) => ({
        ...character,
        image: { objectKey: 'new-key', previewUrl: 'blob:new', blob: null },
      })),
    }));

    expect(request.characters?.[0]).toEqual({
      id: 'char-ha',
      name: '도하람',
      description: '보관소 관리인',
      images: [
        { objectKey: 'new-key', imageName: '도하람_기본' },
        { id: 'img-2' },
      ],
    });
  });

  it('대표 이미지를 지우면 그 이미지만 빼고 나머지 이미지는 id로 남긴다', () => {
    const request = requestAfter((form) => ({
      ...form,
      supporting: form.supporting.map((character) => ({
        ...character,
        image: null,
      })),
    }));

    expect(request.characters?.[0]).toEqual({
      id: 'char-ha',
      name: '도하람',
      description: '보관소 관리인',
      images: [{ id: 'img-2' }],
    });
  });

  it('표지를 지우면 PATCH 본문에는 싣지 않는다', () => {
    expect(requestAfter((form) => ({ ...form, cover: null }))).toEqual({});
  });

  it('표지를 바꾸면 새 객체 키만 보낸다', () => {
    expect(
      requestAfter((form) => ({
        ...form,
        cover: { objectKey: 'cover-new', previewUrl: 'blob:cover', blob: null },
      })),
    ).toEqual({ thumbnailObjectKey: 'cover-new' });
  });

  it('시작 설정을 추가하면 기존 것은 id를 싣고 새 것은 id 없이 보낸다', () => {
    const request = requestAfter((form) => ({
      ...form,
      startSettings: [
        ...form.startSettings,
        {
          ...createStartSettingDraft(),
          name: '첫차',
          prologue: 'p2',
          situation: 's2',
          suggestedInputs: ['d', 'e', 'f'],
        },
      ],
    }));

    expect(request.startSettings?.map((setting) => setting.id)).toEqual([
      'start-1',
      undefined,
    ]);
  });

  it('반려 제출본을 덮어쓸 때는 바뀌지 않은 필드도 모두 보낸다', () => {
    const request = requestAfter((form) => form, EDIT_FORM, true);

    expect(Object.keys(request).sort()).toEqual(
      [
        'characters',
        'description',
        'genres',
        'mainEvents',
        'oneLineIntro',
        'startSettings',
        'storySettings',
        'title',
        'visibility',
      ].sort(),
    );
  });
});
