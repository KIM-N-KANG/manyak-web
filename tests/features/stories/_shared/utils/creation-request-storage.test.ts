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
  StoryCompletionRecord,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  addStoryCompletionRequest,
  demotePendingCompletionToDraft,
  findPendingCreationRequest,
  loadPendingCreationRequests,
  loadStoryCompletionRequests,
  markPendingStoryCreated,
  parsePendingCreationRequest,
  parsePendingCreationRequests,
  parseStoryCompletionRequests,
  PENDING_CREATION_REQUEST_STORAGE_KEY,
  replacePendingCreationRequest,
  saveDraftCreationRecord,
  savePendingCreationRequest,
  takePendingCreationRequest,
  takeStoryCompletionRequest,
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

const completionRecord: StoryCompletionRecord = {
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

  it('완성 레코드는 편집 슬롯 파서가 거부한다', () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(completionRecord)),
    ).toBeNull();
  });
});

describe('parseStoryCompletionRequests', () => {
  it('완성 레코드 목록을 직렬화-역직렬화로 복원한다', () => {
    expect(
      parseStoryCompletionRequests(JSON.stringify([completionRecord])),
    ).toEqual([completionRecord]);
  });

  it('저장값이 없거나 배열이 아니면 빈 목록을 반환한다', () => {
    expect(parseStoryCompletionRequests(null)).toEqual([]);
    expect(parseStoryCompletionRequests('{invalid')).toEqual([]);
    expect(
      parseStoryCompletionRequests(JSON.stringify(completionRecord)),
    ).toEqual([]);
  });

  it('복원 컨텍스트가 빠지거나 스토리 ID 형태가 어긋난 항목만 걸러낸다', () => {
    const { completionRequest: _dropped, ...withoutCompletionRequest } =
      completionRecord;
    const { selectedStoryline: _droppedStoryline, ...withoutStoryline } =
      completionRecord;

    expect(
      parseStoryCompletionRequests(
        JSON.stringify([
          withoutCompletionRequest,
          withoutStoryline,
          { ...completionRecord, createdStoryId: 7 },
          completionRecord,
        ]),
      ),
    ).toEqual([completionRecord]);
  });
});

describe('parsePendingCreationRequests', () => {
  it('배열 저장값은 항목별로 검증해 손상 항목만 걸러낸다', () => {
    const raw = JSON.stringify([
      storylineRecord,
      { stage: 'STORY_DRAFT', requestId: 'broken' },
      keywordDraftRecord,
    ]);

    expect(parsePendingCreationRequests(raw)).toEqual([
      storylineRecord,
      keywordDraftRecord,
    ]);
  });

  it('구 형식(단일 객체)은 1건 배열로 읽는다', () => {
    expect(parsePendingCreationRequests(JSON.stringify(draftRecord))).toEqual([
      draftRecord,
    ]);
  });

  it('저장값이 없거나 파싱할 수 없으면 빈 배열을 반환한다', () => {
    expect(parsePendingCreationRequests(null)).toEqual([]);
    expect(parsePendingCreationRequests('{')).toEqual([]);
    expect(parsePendingCreationRequests('"text"')).toEqual([]);
  });
});

describe('편집 초안 목록', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const values = new Map<string, string>();
  const stubStorage = () => {
    values.clear();

    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  };

  it('같은 requestId는 덮어쓰고 다른 requestId는 공존한다', () => {
    stubStorage();
    savePendingCreationRequest(keywordDraftRecord);
    savePendingCreationRequest(storylineRecord);
    savePendingCreationRequest({
      ...keywordDraftRecord,
      snapshot: { ...keywordDraftRecord.snapshot, selectedGenreTagIds: [9] },
    });

    expect(loadPendingCreationRequests()).toEqual([
      {
        ...keywordDraftRecord,
        snapshot: { ...keywordDraftRecord.snapshot, selectedGenreTagIds: [9] },
      },
      storylineRecord,
    ]);
    expect(findPendingCreationRequest(storylineRecord.requestId)).toEqual(
      storylineRecord,
    );
    expect(findPendingCreationRequest('other')).toBeNull();
  });

  it('같은 requestId의 진행 중 요청은 지연된 초안이 덮지 않는다', () => {
    stubStorage();
    savePendingCreationRequest(storylineRecord);

    expect(saveDraftCreationRecord(draftRecord)).toBe(false);
    expect(loadPendingCreationRequests()).toEqual([storylineRecord]);
  });

  it('다른 requestId의 진행 중 요청이 있어도 초안은 함께 보관한다', () => {
    stubStorage();
    savePendingCreationRequest({
      ...storylineRecord,
      requestId: 'other-generation',
    });

    expect(saveDraftCreationRecord(keywordDraftRecord)).toBe(true);
    expect(loadPendingCreationRequests()).toHaveLength(2);
  });

  it('교체는 같은 requestId가 있을 때만 성공한다', () => {
    stubStorage();
    savePendingCreationRequest(storylineRecord);

    expect(
      replacePendingCreationRequest(storylineRecord.requestId, draftRecord),
    ).toBe(true);
    expect(replacePendingCreationRequest('other', draftRecord)).toBe(false);
    expect(loadPendingCreationRequests()).toEqual([draftRecord]);
  });

  it('제거는 해당 건만 지우고 목록이 비면 키를 없앤다', () => {
    stubStorage();
    savePendingCreationRequest(keywordDraftRecord);
    savePendingCreationRequest(storylineRecord);

    expect(takePendingCreationRequest(keywordDraftRecord.requestId)).toBe(true);
    expect(takePendingCreationRequest(keywordDraftRecord.requestId)).toBe(
      false,
    );
    expect(loadPendingCreationRequests()).toEqual([storylineRecord]);
    expect(takePendingCreationRequest(storylineRecord.requestId)).toBe(true);
    expect(values.has(PENDING_CREATION_REQUEST_STORAGE_KEY)).toBe(false);
  });

  it('완성 제출은 목록에 추가하고 자기 초안만 제거한다', () => {
    stubStorage();
    savePendingCreationRequest(draftRecord);
    savePendingCreationRequest(keywordDraftRecord);

    expect(addStoryCompletionRequest(completionRecord)).toBe(true);
    expect(loadPendingCreationRequests()).toEqual([keywordDraftRecord]);
    expect(loadStoryCompletionRequests()).toEqual([completionRecord]);
  });

  it('완성 요청은 여러 건이 공존하고 requestId별로만 제거한다', () => {
    stubStorage();

    const second: StoryCompletionRecord = {
      ...completionRecord,
      requestId: 'second-completion',
    };

    addStoryCompletionRequest(completionRecord);
    addStoryCompletionRequest(second);

    expect(loadStoryCompletionRequests()).toEqual([completionRecord, second]);
    expect(takeStoryCompletionRequest(completionRecord.requestId)).toBe(true);
    expect(takeStoryCompletionRequest(completionRecord.requestId)).toBe(false);
    expect(loadStoryCompletionRequests()).toEqual([second]);
  });

  it('완성 레코드에 생성된 storyId를 확정해 폴링 재적용을 막는다', () => {
    stubStorage();
    addStoryCompletionRequest(completionRecord);

    expect(
      markPendingStoryCreated(completionRecord.requestId, 'story-created'),
    ).toBe(true);
    expect(markPendingStoryCreated('other', 'story-created')).toBe(false);
    expect(loadStoryCompletionRequests()).toEqual([
      { ...completionRecord, createdStoryId: 'story-created' },
    ]);
  });
});

const draftRecord: StoryDraftRecord = {
  stage: 'STORY_DRAFT',
  requestId: generationRequest.requestId,
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

describe('demotePendingCompletionToDraft', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubStorage = () => {
    const values = new Map<string, string>();

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  };

  it('같은 requestId의 완성 레코드를 추가 정보 단계 초안으로 바꾼다', () => {
    stubStorage();
    addStoryCompletionRequest(completionRecord);

    expect(demotePendingCompletionToDraft(completionRecord.requestId)).toBe(
      true,
    );
    expect(loadStoryCompletionRequests()).toEqual([]);
    // 초안 키는 완성 요청 ID가 아니라 생성 요청 ID다(퍼널 자동 저장 후보와 같은 키).
    expect(loadPendingCreationRequests()).toMatchObject([
      {
        stage: 'STORY_DRAFT',
        step: 'additional-info',
        requestId: generationRequest.requestId,
        selectedStoryline,
        completionRequest,
        createdStoryId: null,
      },
    ]);
  });

  it('다른 requestId이거나 완성 레코드가 아니면 바꾸지 않는다', () => {
    stubStorage();
    savePendingCreationRequest(storylineRecord);

    expect(demotePendingCompletionToDraft(storylineRecord.requestId)).toBe(
      false,
    );
    expect(demotePendingCompletionToDraft('other')).toBe(false);
    expect(loadPendingCreationRequests()).toEqual([storylineRecord]);
  });

  it('다른 초안이 있어도 실패 요청을 초안으로 되돌려 함께 보관한다', () => {
    stubStorage();
    addStoryCompletionRequest(completionRecord);
    savePendingCreationRequest(keywordDraftRecord);

    expect(demotePendingCompletionToDraft(completionRecord.requestId)).toBe(
      true,
    );
    expect(loadStoryCompletionRequests()).toEqual([]);
    expect(loadPendingCreationRequests()).toMatchObject([
      keywordDraftRecord,
      { stage: 'STORY_DRAFT', requestId: generationRequest.requestId },
    ]);
  });
});
