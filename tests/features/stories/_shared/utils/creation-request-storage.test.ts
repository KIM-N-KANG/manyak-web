import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import type {
  KeywordDraftRecord,
  PendingCreationRequest,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  loadPendingCreationRequest,
  markPendingStoryCreated,
  parsePendingCreationRequest,
  saveDraftCreationRecord,
  savePendingCreationRequest,
} from '@/features/stories/_shared/utils/creation-request-storage';

const generationRequest: GenerateSimpleStorylinesRequest = {
  requestId: '11111111-1111-4111-8111-111111111111',
  genreTagIds: [1, 2],
  protagonist: {
    name: '마냑',
    gender: 'FEMALE',
    featureTagIds: [3],
    customTags: ['커스텀'],
  },
  supportingCharacters: [],
};

const storylineRecord: PendingCreationRequest = {
  stage: 'STORYLINE_GENERATION',
  requestId: generationRequest.requestId,
  generationRequest,
};

const selectedStoryline: SimpleStorylineResponse = {
  id: 10,
  storyline: '선택한 스토리라인 본문',
  recommendedInfos: [],
};

const generationResult: GenerateSimpleStorylinesResponse = {
  simpleCreationId: 7,
  storylines: [selectedStoryline],
};

const completionRequest: CreateSimpleStoryRequest = {
  requestId: '22222222-2222-4222-8222-222222222222',
  simpleCreationId: 7,
  storylineId: 10,
  additionalInfos: ['추가 정보'],
};

const completionRecord: PendingCreationRequest = {
  stage: 'STORY_COMPLETION',
  requestId: completionRequest.requestId,
  generationRequest,
  generationResult,
  selectedStoryline,
  completionRequest,
};

const keywordDraftRecord: KeywordDraftRecord = {
  stage: 'KEYWORD_DRAFT',
  requestId: '44444444-4444-4444-8444-444444444444',
  snapshot: {
    selectedGenreTagIds: [1],
    customGenreTags: [{ name: '느와르', selected: false }],
    protagonist: {
      name: '마냑',
      gender: 'FEMALE',
      selectedTagIds: [3],
      customTags: [{ name: '비밀스러운', selected: true }],
    },
    supportingCharacters: [
      {
        name: '',
        gender: null,
        selectedTagIds: [],
        customTags: [],
      },
    ],
  },
};

describe('parsePendingCreationRequest', () => {
  it('스토리라인 생성 레코드를 직렬화-역직렬화로 복원한다', () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(storylineRecord)),
    ).toEqual(storylineRecord);
  });

  it('스토리 완성 레코드를 직렬화-역직렬화로 복원한다', () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(completionRecord)),
    ).toEqual(completionRecord);
  });

  it('키워드 draft를 직렬화-역직렬화로 복원한다', () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(keywordDraftRecord)),
    ).toEqual(keywordDraftRecord);
  });

  it('저장값이 없으면 null을 반환한다', () => {
    expect(parsePendingCreationRequest(null)).toBeNull();
    expect(parsePendingCreationRequest('')).toBeNull();
  });

  it('JSON 파싱 실패는 null로 처리한다', () => {
    expect(parsePendingCreationRequest('{invalid')).toBeNull();
  });

  it('객체가 아닌 값은 null로 처리한다', () => {
    expect(parsePendingCreationRequest('"문자열"')).toBeNull();
    expect(parsePendingCreationRequest('[1,2]')).toBeNull();
  });

  it('알 수 없는 stage는 null로 처리한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...storylineRecord, stage: 'UNKNOWN' }),
      ),
    ).toBeNull();
  });

  it('requestId가 문자열이 아니면 null로 처리한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...storylineRecord, requestId: 123 }),
      ),
    ).toBeNull();
  });

  it('스토리라인 레코드에 생성 요청 본문이 없으면 null로 처리한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          requestId: storylineRecord.requestId,
        }),
      ),
    ).toBeNull();
  });

  it('완성 레코드에 복원 컨텍스트가 하나라도 없으면 null로 처리한다', () => {
    const { completionRequest: _dropped, ...withoutCompletionRequest } =
      completionRecord;

    expect(
      parsePendingCreationRequest(JSON.stringify(withoutCompletionRequest)),
    ).toBeNull();

    const { selectedStoryline: _droppedStoryline, ...withoutStoryline } =
      completionRecord;

    expect(
      parsePendingCreationRequest(JSON.stringify(withoutStoryline)),
    ).toBeNull();
  });

  it('완성 레코드의 생성된 스토리 ID가 문자열·null이 아니면 거부한다', () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...completionRecord, createdStoryId: 7 }),
      ),
    ).toBeNull();
  });
});

describe('saveDraftCreationRecord 우선순위', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubStorage = () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  };

  it('진행 중 요청은 지연된 story draft보다 우선한다', () => {
    stubStorage();
    savePendingCreationRequest(storylineRecord);

    expect(saveDraftCreationRecord(draftRecord)).toBe(false);
    expect(loadPendingCreationRequest()).toEqual(storylineRecord);
  });

  it('story draft는 지연된 keyword draft보다 우선한다', () => {
    stubStorage();
    savePendingCreationRequest(draftRecord);

    expect(saveDraftCreationRecord(keywordDraftRecord)).toBe(false);
    expect(loadPendingCreationRequest()).toEqual(draftRecord);
  });

  it('story draft는 기존 keyword draft를 승격해 덮어쓴다', () => {
    stubStorage();
    savePendingCreationRequest(keywordDraftRecord);

    expect(saveDraftCreationRecord(draftRecord)).toBe(true);
    expect(loadPendingCreationRequest()).toEqual(draftRecord);
  });

  it('완성 레코드에 생성된 storyId를 확정해 채팅 재시도에 남긴다', () => {
    stubStorage();
    savePendingCreationRequest(completionRecord);

    expect(
      markPendingStoryCreated(completionRecord.requestId, 'story-created'),
    ).toBe(true);
    expect(loadPendingCreationRequest()).toEqual({
      ...completionRecord,
      createdStoryId: 'story-created',
    });
  });
});

const draftRecord: StoryDraftRecord = {
  stage: 'STORY_DRAFT',
  requestId: '33333333-3333-4333-8333-333333333333',
  step: 'additional-info',
  generationRequest,
  generationResult,
  activeStorylineIndex: 0,
  selectedStoryline,
  additionalInfos: ['직접 입력한 추가 정보'],
  selectedRecommendations: ['추천 정보'],
  createdStoryId: null,
  completionRequest: null,
};

describe('parsePendingCreationRequest — STORY_DRAFT', () => {
  it('유효한 draft 레코드를 파싱한다', () => {
    expect(parsePendingCreationRequest(JSON.stringify(draftRecord))).toEqual(
      draftRecord,
    );
  });

  it('storyline-select 스텝은 selectedStoryline이 null이어도 유효하다', () => {
    const record = {
      ...draftRecord,
      step: 'storyline-select',
      selectedStoryline: null,
    };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toEqual(record);
  });

  it('additional-info 스텝에 selectedStoryline이 없으면 null을 반환한다', () => {
    const record = { ...draftRecord, selectedStoryline: null };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('step 값이 어긋나면 null을 반환한다', () => {
    const record = { ...draftRecord, step: 'complete' };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('additionalInfos가 문자열 배열이 아니면 null을 반환한다', () => {
    const record = { ...draftRecord, additionalInfos: [1, 2] };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('createdStoryId가 문자열도 null도 아니면 null을 반환한다', () => {
    const record = { ...draftRecord, createdStoryId: 7 };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });
});
