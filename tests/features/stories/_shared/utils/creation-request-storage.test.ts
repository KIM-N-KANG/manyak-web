import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateSimpleStoryRequest,
  GenerateSimpleStorylinesRequest,
  GenerateSimpleStorylinesResponse,
  SimpleStorylineResponse,
} from '@/api/generated/models';
import {
  creationDb,
  getCreationEpoch,
} from '@/features/stories/_shared/utils/creation-db';
import type {
  KeywordDraftRecord,
  PendingCreationRequest,
  StoryCompletionRecord,
  StoryDraftRecord,
} from '@/features/stories/_shared/utils/creation-request-storage';
import {
  addStoryCompletionRequest,
  clearCreationStorage,
  demotePendingCompletionToDraft,
  findPendingCreationRequest,
  initializeCreationStorage,
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
  sortByCreatedAtDesc,
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
  it('스토리라인 생성 레코드를 직렬화-역직렬화로 복원한다', async () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(storylineRecord)),
    ).toEqual(storylineRecord);
  });

  it('키워드 draft를 직렬화-역직렬화로 복원한다', async () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(keywordDraftRecord)),
    ).toEqual(keywordDraftRecord);
  });

  it('저장값이 없으면 null을 반환한다', async () => {
    expect(parsePendingCreationRequest(null)).toBeNull();
    expect(parsePendingCreationRequest('')).toBeNull();
  });

  it('JSON 파싱 실패는 null로 처리한다', async () => {
    expect(parsePendingCreationRequest('{invalid')).toBeNull();
  });

  it('객체가 아닌 값은 null로 처리한다', async () => {
    expect(parsePendingCreationRequest('"문자열"')).toBeNull();
    expect(parsePendingCreationRequest('[1,2]')).toBeNull();
  });

  it('알 수 없는 stage는 null로 처리한다', async () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...storylineRecord, stage: 'UNKNOWN' }),
      ),
    ).toBeNull();
  });

  it('requestId가 문자열이 아니면 null로 처리한다', async () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({ ...storylineRecord, requestId: 123 }),
      ),
    ).toBeNull();
  });

  it('스토리라인 레코드에 생성 요청 본문이 없으면 null로 처리한다', async () => {
    expect(
      parsePendingCreationRequest(
        JSON.stringify({
          stage: 'STORYLINE_GENERATION',
          requestId: storylineRecord.requestId,
        }),
      ),
    ).toBeNull();
  });

  it('완성 레코드는 편집 슬롯 파서가 거부한다', async () => {
    expect(
      parsePendingCreationRequest(JSON.stringify(completionRecord)),
    ).toBeNull();
  });
});

describe('parseStoryCompletionRequests', () => {
  it('완성 레코드 목록을 직렬화-역직렬화로 복원한다', async () => {
    expect(
      parseStoryCompletionRequests(JSON.stringify([completionRecord])),
    ).toEqual([completionRecord]);
  });

  it('저장값이 없거나 배열이 아니면 빈 목록을 반환한다', async () => {
    expect(parseStoryCompletionRequests(null)).toEqual([]);
    expect(parseStoryCompletionRequests('{invalid')).toEqual([]);
    expect(
      parseStoryCompletionRequests(JSON.stringify(completionRecord)),
    ).toEqual([]);
  });

  it('복원 컨텍스트가 빠지거나 스토리 ID 형태가 어긋난 항목만 걸러낸다', async () => {
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
  it('배열 저장값은 항목별로 검증해 손상 항목만 걸러낸다', async () => {
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

  it('구 형식(단일 객체)은 1건 배열로 읽는다', async () => {
    expect(parsePendingCreationRequests(JSON.stringify(draftRecord))).toEqual([
      draftRecord,
    ]);
  });

  it('저장값이 없거나 파싱할 수 없으면 빈 배열을 반환한다', async () => {
    expect(parsePendingCreationRequests(null)).toEqual([]);
    expect(parsePendingCreationRequests('{')).toEqual([]);
    expect(parsePendingCreationRequests('"text"')).toEqual([]);
  });
});

/** 저장 시각을 고정해 createdAt 도장을 검증한다. */
const SAVED_AT = '2026-09-22T05:00:00.000Z';
const stamped = <Record extends { requestId: string }>(record: Record) => ({
  ...record,
  createdAt: SAVED_AT,
});

beforeEach(async () => {
  await creationDb.transaction('rw', creationDb.tables, async () => {
    for (const table of creationDb.tables) await table.clear();
  });
});

describe('편집 초안 목록', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const values = new Map<string, string>();
  const stubStorage = () => {
    values.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(SAVED_AT));

    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  };

  it('같은 requestId는 덮어쓰고 다른 requestId는 공존한다', async () => {
    stubStorage();
    await savePendingCreationRequest(keywordDraftRecord);
    await savePendingCreationRequest(storylineRecord);
    await savePendingCreationRequest({
      ...keywordDraftRecord,
      snapshot: { ...keywordDraftRecord.snapshot, selectedGenreTagIds: [9] },
    });

    expect(await loadPendingCreationRequests()).toEqual([
      stamped({
        ...keywordDraftRecord,
        snapshot: { ...keywordDraftRecord.snapshot, selectedGenreTagIds: [9] },
      }),
      stamped(storylineRecord),
    ]);
    expect(await findPendingCreationRequest(storylineRecord.requestId)).toEqual(
      stamped(storylineRecord),
    );
    expect(await findPendingCreationRequest('other')).toBeNull();
  });

  it('처음 저장 시각은 갱신·교체·완성 이관·강등에도 유지한다', async () => {
    stubStorage();
    await savePendingCreationRequest(storylineRecord);
    vi.setSystemTime(new Date('2026-09-22T06:00:00.000Z'));

    expect(
      await replacePendingCreationRequest(
        storylineRecord.requestId,
        draftRecord,
      ),
    ).toBe(true);
    expect(await saveDraftCreationRecord(draftRecord)).toBe(true);
    expect(await loadPendingCreationRequests()).toEqual([stamped(draftRecord)]);

    expect(await addStoryCompletionRequest(completionRecord)).toBe(true);
    expect(await loadStoryCompletionRequests()).toEqual([
      stamped(completionRecord),
    ]);

    expect(
      await demotePendingCompletionToDraft(completionRecord.requestId),
    ).toBe(true);
    expect(await loadPendingCreationRequests()).toMatchObject([
      { stage: 'STORY_DRAFT', createdAt: SAVED_AT },
    ]);
  });

  it('같은 requestId의 진행 중 요청은 지연된 초안이 덮지 않는다', async () => {
    stubStorage();
    await savePendingCreationRequest(storylineRecord);

    expect(await saveDraftCreationRecord(draftRecord)).toBe(false);
    expect(await loadPendingCreationRequests()).toEqual([
      stamped(storylineRecord),
    ]);
  });

  it('다른 requestId의 진행 중 요청이 있어도 초안은 함께 보관한다', async () => {
    stubStorage();
    await savePendingCreationRequest({
      ...storylineRecord,
      requestId: 'other-generation',
    });

    expect(await saveDraftCreationRecord(keywordDraftRecord)).toBe(true);
    expect(await loadPendingCreationRequests()).toHaveLength(2);
  });

  it('교체는 같은 requestId가 있을 때만 성공한다', async () => {
    stubStorage();
    await savePendingCreationRequest(storylineRecord);

    expect(
      await replacePendingCreationRequest(
        storylineRecord.requestId,
        draftRecord,
      ),
    ).toBe(true);
    expect(await replacePendingCreationRequest('other', draftRecord)).toBe(
      false,
    );
    expect(await loadPendingCreationRequests()).toEqual([stamped(draftRecord)]);
  });

  it('제거는 해당 건만 지우고 목록이 비면 키를 없앤다', async () => {
    stubStorage();
    await savePendingCreationRequest(keywordDraftRecord);
    await savePendingCreationRequest(storylineRecord);

    expect(await takePendingCreationRequest(keywordDraftRecord.requestId)).toBe(
      true,
    );
    expect(await takePendingCreationRequest(keywordDraftRecord.requestId)).toBe(
      false,
    );
    expect(await loadPendingCreationRequests()).toEqual([
      stamped(storylineRecord),
    ]);
    expect(await takePendingCreationRequest(storylineRecord.requestId)).toBe(
      true,
    );
    expect(values.has(PENDING_CREATION_REQUEST_STORAGE_KEY)).toBe(false);
  });

  it('완성 제출은 목록에 추가하고 자기 초안만 제거한다', async () => {
    stubStorage();
    await savePendingCreationRequest(draftRecord);
    await savePendingCreationRequest(keywordDraftRecord);

    expect(await addStoryCompletionRequest(completionRecord)).toBe(true);
    expect(await loadPendingCreationRequests()).toEqual([
      stamped(keywordDraftRecord),
    ]);
    expect(await loadStoryCompletionRequests()).toEqual([
      stamped(completionRecord),
    ]);
  });

  it('완성 요청은 여러 건이 공존하고 requestId별로만 제거한다', async () => {
    stubStorage();

    const second: StoryCompletionRecord = {
      ...completionRecord,
      requestId: 'second-completion',
    };

    await savePendingCreationRequest(draftRecord);
    await addStoryCompletionRequest(completionRecord);
    await savePendingCreationRequest(draftRecord);
    await addStoryCompletionRequest(second);

    expect(await loadStoryCompletionRequests()).toMatchObject([
      completionRecord,
      second,
    ]);
    expect(await takeStoryCompletionRequest(completionRecord.requestId)).toBe(
      true,
    );
    expect(await takeStoryCompletionRequest(completionRecord.requestId)).toBe(
      false,
    );
    expect(await loadStoryCompletionRequests()).toMatchObject([second]);
  });

  it('완성 레코드에 생성된 storyId를 확정해 폴링 재적용을 막는다', async () => {
    stubStorage();
    await savePendingCreationRequest(draftRecord);
    await addStoryCompletionRequest(completionRecord);

    expect(
      await markPendingStoryCreated(
        completionRecord.requestId,
        'story-created',
      ),
    ).toBe(true);
    expect(await markPendingStoryCreated('other', 'story-created')).toBe(false);
    expect(await loadStoryCompletionRequests()).toMatchObject([
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
  it('유효한 draft 레코드를 파싱한다', async () => {
    expect(parsePendingCreationRequest(JSON.stringify(draftRecord))).toEqual(
      draftRecord,
    );
  });

  it('storyline-select 스텝은 selectedStoryline이 null이어도 유효하다', async () => {
    const record = {
      ...draftRecord,
      step: 'storyline-select',
      selectedStoryline: null,
    };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toEqual(record);
  });

  it('additional-info 스텝에 selectedStoryline이 없으면 null을 반환한다', async () => {
    const record = { ...draftRecord, selectedStoryline: null };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('step 값이 어긋나면 null을 반환한다', async () => {
    const record = { ...draftRecord, step: 'complete' };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('additionalInfos가 문자열 배열이 아니면 null을 반환한다', async () => {
    const record = { ...draftRecord, additionalInfos: [1, 2] };

    expect(parsePendingCreationRequest(JSON.stringify(record))).toBeNull();
  });

  it('createdStoryId가 문자열도 null도 아니면 null을 반환한다', async () => {
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

  it('같은 requestId의 완성 레코드를 추가 정보 단계 초안으로 바꾼다', async () => {
    stubStorage();
    await savePendingCreationRequest(draftRecord);
    await addStoryCompletionRequest(completionRecord);

    expect(
      await demotePendingCompletionToDraft(completionRecord.requestId),
    ).toBe(true);
    expect(await loadStoryCompletionRequests()).toEqual([]);
    // 초안 키는 완성 요청 ID가 아니라 생성 요청 ID다(퍼널 자동 저장 후보와 같은 키).
    expect(await loadPendingCreationRequests()).toMatchObject([
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

  it('다른 requestId이거나 완성 레코드가 아니면 바꾸지 않는다', async () => {
    stubStorage();
    await savePendingCreationRequest(storylineRecord);

    expect(
      await demotePendingCompletionToDraft(storylineRecord.requestId),
    ).toBe(false);
    expect(await demotePendingCompletionToDraft('other')).toBe(false);
    expect(await loadPendingCreationRequests()).toMatchObject([
      storylineRecord,
    ]);
  });

  it('다른 초안이 있어도 실패 요청을 초안으로 되돌려 함께 보관한다', async () => {
    stubStorage();
    await savePendingCreationRequest(draftRecord);
    await addStoryCompletionRequest(completionRecord);
    await savePendingCreationRequest(keywordDraftRecord);

    expect(
      await demotePendingCompletionToDraft(completionRecord.requestId),
    ).toBe(true);
    expect(await loadStoryCompletionRequests()).toEqual([]);
    expect(await loadPendingCreationRequests()).toMatchObject([
      { stage: 'STORY_DRAFT', requestId: generationRequest.requestId },
      keywordDraftRecord,
    ]);
  });
});

describe('sortByCreatedAtDesc', () => {
  it('처음 저장 시각이 최신인 것을 앞에 두고 시각이 없는 구 레코드는 순서를 지켜 뒤로 보낸다', async () => {
    const legacyA = { requestId: 'legacy-a', createdAt: undefined };
    const legacyB = { requestId: 'legacy-b', createdAt: undefined };
    const older = { requestId: 'older', createdAt: '2026-09-20T00:00:00.000Z' };
    const newer = { requestId: 'newer', createdAt: '2026-09-22T00:00:00.000Z' };

    expect(sortByCreatedAtDesc([legacyA, older, legacyB, newer])).toEqual([
      newer,
      older,
      legacyA,
      legacyB,
    ]);
  });
});

describe('Dexie 이관과 원자적 전환', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('구 단일 객체를 이관하고 삭제 후 재초기화해도 초안을 되살리지 않는다', async () => {
    values.set(
      PENDING_CREATION_REQUEST_STORAGE_KEY,
      JSON.stringify(keywordDraftRecord),
    );
    await Promise.all([
      initializeCreationStorage(),
      initializeCreationStorage(),
    ]);
    expect(await loadPendingCreationRequests()).toEqual([keywordDraftRecord]);
    expect(values.has(PENDING_CREATION_REQUEST_STORAGE_KEY)).toBe(false);
    await takePendingCreationRequest(keywordDraftRecord.requestId);
    // 구 키 정리에 실패한 상황을 재현한다.
    values.set(
      PENDING_CREATION_REQUEST_STORAGE_KEY,
      JSON.stringify(keywordDraftRecord),
    );
    await initializeCreationStorage();
    expect(await loadPendingCreationRequests()).toEqual([]);
  });

  it('손상 항목이 섞이면 유효한 초안은 이관하고 원본 문자열은 보존한다', async () => {
    const raw = JSON.stringify([
      keywordDraftRecord,
      { broken: true },
      storylineRecord,
    ]);

    values.set(PENDING_CREATION_REQUEST_STORAGE_KEY, raw);
    expect(await loadPendingCreationRequests()).toEqual([
      keywordDraftRecord,
      storylineRecord,
    ]);
    expect(values.get(PENDING_CREATION_REQUEST_STORAGE_KEY)).toBe(raw);
  });

  it('이관 중 DB 실패는 전체 취소하고 원본과 재시도 가능성을 보존한다', async () => {
    values.set(
      PENDING_CREATION_REQUEST_STORAGE_KEY,
      JSON.stringify([keywordDraftRecord, storylineRecord]),
    );

    const add = vi.spyOn(creationDb.pendingCreations, 'add');

    add.mockRejectedValueOnce(new Error('QuotaExceededError'));
    await expect(initializeCreationStorage()).rejects.toThrow();
    expect(await creationDb.pendingCreations.count()).toBe(0);
    expect(values.has(PENDING_CREATION_REQUEST_STORAGE_KEY)).toBe(true);
    add.mockRestore();
    expect(await loadPendingCreationRequests()).toEqual([
      keywordDraftRecord,
      storylineRecord,
    ]);
  });

  it('완성 요청 추가 후 초안 삭제가 실패하면 두 변경을 함께 되돌린다', async () => {
    await saveDraftCreationRecord(draftRecord);
    vi.spyOn(creationDb.pendingCreations, 'delete').mockRejectedValueOnce(
      new Error('write failed'),
    );
    expect(await addStoryCompletionRequest(completionRecord)).toBe(false);
    expect(await loadStoryCompletionRequests()).toEqual([]);
    expect(
      await findPendingCreationRequest(draftRecord.requestId),
    ).toMatchObject(draftRecord);
  });

  it('완성 실패의 초안 복원이 실패하면 완성 기록도 남긴다', async () => {
    await saveDraftCreationRecord(draftRecord);
    await addStoryCompletionRequest(completionRecord);
    vi.spyOn(creationDb.pendingCreations, 'put').mockRejectedValueOnce(
      new Error('write failed'),
    );
    expect(
      await demotePendingCompletionToDraft(completionRecord.requestId),
    ).toBe(false);
    expect(await loadStoryCompletionRequests()).toHaveLength(1);
  });

  it('동시에 들어온 성공 응답 중 한 경로만 상태 전환에 성공한다', async () => {
    await savePendingCreationRequest(storylineRecord);
    expect(
      await Promise.all([
        replacePendingCreationRequest(storylineRecord.requestId, draftRecord),
        replacePendingCreationRequest(storylineRecord.requestId, draftRecord),
      ]),
    ).toEqual([true, false]);
    await addStoryCompletionRequest(completionRecord);
    expect(
      await Promise.all([
        markPendingStoryCreated(completionRecord.requestId, 'story'),
        markPendingStoryCreated(completionRecord.requestId, 'story'),
      ]),
    ).toEqual([true, false]);
  });

  it('삭제되거나 완성 단계로 이동한 초안을 지연 저장으로 되살리지 않는다', async () => {
    await saveDraftCreationRecord(draftRecord);
    await addStoryCompletionRequest(completionRecord);
    expect(
      await saveDraftCreationRecord(draftRecord, 0, draftRecord.requestId),
    ).toBe(false);
    await saveDraftCreationRecord(keywordDraftRecord);
    await takePendingCreationRequest(keywordDraftRecord.requestId);
    expect(
      await saveDraftCreationRecord(
        keywordDraftRecord,
        0,
        keywordDraftRecord.requestId,
      ),
    ).toBe(false);
  });

  it('세션 정리 후 이전 세대의 쓰기와 구 데이터 재이관을 거부한다', async () => {
    const previousEpoch = getCreationEpoch();

    await saveDraftCreationRecord(draftRecord, previousEpoch);
    await clearCreationStorage();
    expect(await saveDraftCreationRecord(draftRecord, previousEpoch)).toBe(
      false,
    );
    values.set(
      PENDING_CREATION_REQUEST_STORAGE_KEY,
      JSON.stringify(keywordDraftRecord),
    );
    expect(await loadPendingCreationRequests()).toEqual([]);
    expect(
      await saveDraftCreationRecord(keywordDraftRecord, getCreationEpoch()),
    ).toBe(true);
  });

  it('초안 ID를 교체해 저장할 때 이전 초안을 남기지 않고 최초 시각을 전달한다', async () => {
    await saveDraftCreationRecord(keywordDraftRecord);

    const before = await findPendingCreationRequest(
      keywordDraftRecord.requestId,
    );
    const replacement = { ...keywordDraftRecord, requestId: 'replacement' };

    expect(
      await saveDraftCreationRecord(
        replacement,
        0,
        keywordDraftRecord.requestId,
      ),
    ).toBe(true);
    expect(await loadPendingCreationRequests()).toEqual([
      { ...replacement, createdAt: before?.createdAt },
    ]);
  });

  it('세대값 쓰기와 DB 정리가 모두 실패해도 같은 탭의 이전 세션 쓰기를 막는다', async () => {
    await saveDraftCreationRecord(draftRecord);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const clear = vi
      .spyOn(creationDb.pendingCreations, 'clear')
      .mockRejectedValueOnce(new Error('temporarily unavailable'));

    await expect(clearCreationStorage()).rejects.toThrow();
    clear.mockRestore();
    expect(await saveDraftCreationRecord(keywordDraftRecord, 0)).toBe(false);
    await expect(loadPendingCreationRequests()).rejects.toThrow();
  });

  it('DB 정리가 실패해도 다음 접근에서 이전 계정 데이터를 먼저 지운다', async () => {
    await saveDraftCreationRecord(draftRecord);

    const clear = vi
      .spyOn(creationDb.pendingCreations, 'clear')
      .mockRejectedValueOnce(new Error('temporarily unavailable'));

    await expect(clearCreationStorage()).rejects.toThrow();
    clear.mockRestore();
    expect(await loadPendingCreationRequests()).toEqual([]);
  });
});
