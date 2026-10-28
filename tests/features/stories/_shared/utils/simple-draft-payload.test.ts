import { describe, expect, it } from 'vitest';

import type {
  GenerateSimpleStorylinesResponse,
  PutStoryDraftRequest,
} from '@/api/generated/models';
import type {
  KeywordDraftRecord,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  readSimpleDraftDetail,
  SIMPLE_DRAFT_SCHEMA_VERSION,
  toSimpleDraftRequest,
} from '@/features/stories/_shared/utils/simple-draft-payload';
import type { StoryDraftDetail } from '@/features/stories/_shared/utils/story-draft-response';

const DRAFT_ID = '16670000-0000-4000-8000-000000000001';
const CREATED_AT = '2026-10-16T01:00:00Z';

const keywordRecord: KeywordDraftRecord = {
  stage: 'KEYWORD_DRAFT',
  requestId: DRAFT_ID,
  snapshot: {
    selectedGenreTagIds: [1],
    addedGenreTagIds: [],
    customGenreTags: [],
    protagonist: {
      name: '마냑',
      gender: null,
      selectedTagIds: [2],
      customTags: [{ name: '비밀스러운', selected: true }],
    },
    supportingCharacters: [],
  },
};

const generationResult: GenerateSimpleStorylinesResponse = {
  simpleCreationId: 1001,
  selectedTags: { genreTags: [], supportingCharacters: [] },
  storylines: [
    {
      id: 101,
      storyline: '첫 번째 이야기 흐름입니다.',
      recommendedInfos: [{ id: 1, text: '주인공은 비밀을 품고 있다' }],
    },
    { id: 102, storyline: '두 번째 이야기 흐름입니다.', recommendedInfos: [] },
  ],
};

const storyRecord: StoryDraftRecord = {
  stage: 'STORY_DRAFT',
  requestId: '11111111-1111-4111-8111-111111111111',
  step: 'storyline-select',
  generationRequest: {
    requestId: '11111111-1111-4111-8111-111111111111',
    genreTagIds: [1],
    protagonist: {
      name: null,
      gender: null,
      featureTagIds: [2],
      customTags: [],
    },
    supportingCharacters: [],
  },
  generationResult,
  activeStorylineIndex: 1,
  selectedStoryline: null,
  additionalInfos: [],
  selectedRecommendations: [],
  createdStoryId: null,
  completionRequest: null,
};

const additionalInfoRecord: StoryDraftRecord = {
  ...storyRecord,
  step: 'additional-info',
  activeStorylineIndex: 0,
  selectedStoryline: generationResult.storylines![0],
  additionalInfos: ['비 오는 밤'],
  selectedRecommendations: ['주인공은 비밀을 품고 있다'],
  artStyle: 'WATERCOLOR',
  visibility: 'PRIVATE',
};

/** PUT 본문을 서버가 돌려줄 상세로 바꾼다. */
const toDetail = (
  body: PutStoryDraftRequest,
  generation: StoryDraftDetail['generation'] = {
    status: 'COMPLETED',
    result: generationResult,
  },
): StoryDraftDetail => ({
  draftId: DRAFT_ID,
  mode: 'SIMPLE',
  stage: body.stage as StoryDraftDetail['stage'],
  title: body.title ?? null,
  oneLineIntro: body.oneLineIntro ?? null,
  thumbnailUrl: null,
  version: 3,
  createdAt: CREATED_AT,
  schemaVersion: body.schemaVersion ?? 0,
  payload: body.payload as unknown as Record<string, unknown>,
  imageUrls: {},
  generationRequestId: body.generationRequestId ?? null,
  generation,
});

describe('toSimpleDraftRequest', () => {
  it('키워드 초안은 스냅숏을 payload로 싣고 요약 필드를 비운다', () => {
    expect(toSimpleDraftRequest(keywordRecord, 2)).toEqual({
      mode: 'SIMPLE',
      stage: 'KEYWORD_DRAFT',
      schemaVersion: SIMPLE_DRAFT_SCHEMA_VERSION,
      payload: keywordRecord.snapshot,
      baseVersion: 2,
      title: null,
      oneLineIntro: null,
      thumbnailObjectKey: null,
      generationRequestId: null,
    });
  });

  it('스토리라인 초안은 생성 요청에 연결하고 생성 결과는 싣지 않는다', () => {
    const body = toSimpleDraftRequest(storyRecord, null);
    const payload = body.payload as unknown as Record<string, unknown>;

    expect(body.stage).toBe('STORY_DRAFT');
    expect(body.generationRequestId).toBe(
      storyRecord.generationRequest.requestId,
    );
    expect(body.oneLineIntro).toBeNull();
    expect('generationResult' in payload).toBe(false);
    expect(payload).toMatchObject({
      step: 'storyline-select',
      generationRequest: storyRecord.generationRequest,
      activeStorylineIndex: 1,
      selectedStorylineId: null,
      artStyle: null,
    });
  });

  it('추가 정보 단계에서는 고른 스토리라인 본문을 요약 필드에 싣는다', () => {
    const body = toSimpleDraftRequest(additionalInfoRecord, 1);

    expect(body.oneLineIntro).toBe('첫 번째 이야기 흐름입니다.');
    expect(body.payload).toMatchObject({
      selectedStorylineId: 101,
      additionalInfos: ['비 오는 밤'],
      selectedRecommendations: ['주인공은 비밀을 품고 있다'],
      artStyle: 'WATERCOLOR',
      visibility: 'PRIVATE',
    });
  });
});

describe('readSimpleDraftDetail', () => {
  it('키워드 초안은 초안 ID를 요청 ID로 삼아 읽는다', () => {
    expect(
      readSimpleDraftDetail(
        toDetail(toSimpleDraftRequest(keywordRecord, null)),
      ),
    ).toEqual({
      kind: 'ok',
      record: { ...keywordRecord, createdAt: CREATED_AT },
    });
  });

  it('키워드 초안의 선택 필드가 null이면 없음으로 읽는다', () => {
    const { addedGenreTagIds, ...snapshot } = keywordRecord.snapshot;

    void addedGenreTagIds;

    expect(
      readSimpleDraftDetail({
        ...toDetail(toSimpleDraftRequest(keywordRecord, null)),
        payload: { ...snapshot, addedGenreTagIds: null },
      }),
    ).toEqual({
      kind: 'ok',
      record: { ...keywordRecord, createdAt: CREATED_AT, snapshot },
    });
  });

  it('스토리라인 초안을 생성 결과와 합쳐 원래 기록으로 되돌린다', () => {
    expect(
      readSimpleDraftDetail(
        toDetail(toSimpleDraftRequest(additionalInfoRecord, null)),
      ),
    ).toEqual({
      kind: 'ok',
      record: {
        ...additionalInfoRecord,
        createdAt: CREATED_AT,
        draftId: DRAFT_ID,
        draftVersion: 3,
      },
    });
  });

  it('고른 스토리라인을 결과에서 찾지 못하면 스토리라인 선택 단계로 연다', () => {
    const body = toSimpleDraftRequest(additionalInfoRecord, null);
    const result = readSimpleDraftDetail(
      toDetail({
        ...body,
        payload: {
          ...(body.payload as object),
          selectedStorylineId: 999,
        } as PutStoryDraftRequest['payload'],
      }),
    );

    expect(result).toMatchObject({
      kind: 'ok',
      record: { step: 'storyline-select', selectedStoryline: null },
    });
  });

  it('빠진 선택 필드는 기본값으로 채운다', () => {
    const { artStyle, selectedRecommendations, visibility, ...rest } =
      toSimpleDraftRequest(additionalInfoRecord, null)
        .payload as unknown as Record<string, unknown>;

    void artStyle;
    void selectedRecommendations;
    void visibility;

    const result = readSimpleDraftDetail({
      ...toDetail(toSimpleDraftRequest(additionalInfoRecord, null)),
      payload: rest,
    });

    expect(result.kind).toBe('ok');

    const record = result.kind === 'ok' ? result.record : null;

    expect(record?.stage === 'STORY_DRAFT' && record.artStyle).toBeFalsy();
    // 공개 스위치 전 초안이나 웹 이전 버전 초안은 공개 범위가 없어 퍼널이 기본값인 공개로 연다.
    expect(record?.stage === 'STORY_DRAFT' && record.visibility).toBeFalsy();
    expect(
      record?.stage === 'STORY_DRAFT' && record.selectedRecommendations,
    ).toEqual([]);
  });

  it('생성 결과를 받을 수 없으면 생성 결과 없음으로 알린다', () => {
    const body = toSimpleDraftRequest(storyRecord, null);

    expect(readSimpleDraftDetail(toDetail(body, null))).toEqual({
      kind: 'missingGeneration',
    });
    expect(
      readSimpleDraftDetail(
        toDetail(body, { status: 'PENDING', result: null }),
      ),
    ).toEqual({ kind: 'missingGeneration' });
  });

  it('간편 제작 초안이 아니거나 형식을 읽을 수 없으면 읽지 않는다', () => {
    const keyword = toDetail(toSimpleDraftRequest(keywordRecord, null));

    expect(readSimpleDraftDetail({ ...keyword, mode: 'GENERAL' })).toEqual({
      kind: 'unreadable',
    });
    expect(readSimpleDraftDetail({ ...keyword, schemaVersion: 2 })).toEqual({
      kind: 'unreadable',
    });
    expect(
      readSimpleDraftDetail({
        ...keyword,
        payload: { selectedGenreTagIds: 'broken' },
      }),
    ).toEqual({ kind: 'unreadable' });
    expect(
      readSimpleDraftDetail({
        ...toDetail(toSimpleDraftRequest(storyRecord, null)),
        payload: { step: 'storyline-select' },
      }),
    ).toEqual({ kind: 'unreadable' });
  });
});
